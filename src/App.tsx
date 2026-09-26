import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open, save } from "@tauri-apps/plugin-dialog";
import { copyFile, readFile } from "@tauri-apps/plugin-fs";
import { join, tempDir } from "@tauri-apps/api/path";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ArrowIcon from "./assets/arrow.svg";
import FileIcon from "./assets/file.svg";
import UploadIcon from "./assets/upload.svg";
import { AudioOptions } from "./components/AudioOptions";
import { FormatDropdown } from "./components/FormatDropdown";
import { ImageOptions } from "./components/ImageOptions";
import { MediaPreview } from "./components/MediaPreview";
import { ResizeOptions } from "./components/ResizeOptions";
import { VideoOptions } from "./components/VideoOptions";
import {
  AUDIO_FORMATS,
  type AudioCompressionOptions,
  type AudioFormat,
  type Format,
  formatToExtension,
  IMAGE_FORMATS,
  type ImageFormat,
  isAudioFormat,
  type MediaDimensions,
  mimeTypes,
  SUPPORTED_FORMATS,
  VIDEO_FORMATS,
  type VideoFormat,
} from "./formats.ts";
import { useTranslation } from "./i18n";
import {
  clampDimension,
  MAX_DIMENSION,
  normalizeVideoDimension,
} from "./utils/dimension.ts";
import { apiErrorMessage } from "./utils/error.ts";
import { buildFfmpegArgs } from "./utils/ffmpeg.ts";
import { buildProbeArgs, parsePngDimensions } from "./utils/ffmpeg-command.ts";
import { detectFormatFromPath, getExtensionFromPath } from "./utils/path.ts";

async function createTauriTempPath(
  prefix: string,
  extension: string,
): Promise<string> {
  const directory = await tempDir();
  return join(
    directory,
    "henkanhakase",
    `${prefix}_${crypto.randomUUID()}.${extension}`,
  );
}

function App() {
  const { locale, setLocale, t } = useTranslation();
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [sourceFilePath, setSourceFilePath] = useState<string | null>(null);
  const [sourceFileType, setSourceFileType] = useState<Format | null>(null);
  const [sourceFileObj, setSourceFileObj] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const [convertedFilePath, setConvertedFilePath] = useState<string | null>(
    null,
  );
  const [convertedFileName, setConvertedFileName] = useState<string | null>(
    null,
  );
  const [convertedFileFormat, setConvertedFileFormat] = useState<Format | null>(
    null,
  );
  const [convertedSettingsKey, setConvertedSettingsKey] = useState<
    string | null
  >(null);

  const sourceFormat = sourceFileType;
  const [convertedFormat, setConvertedFormat] = useState<Format>("PNG");
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaDimensions, setMediaDimensions] =
    useState<MediaDimensions | null>(null);
  const [isProbingDimensions, setIsProbingDimensions] = useState(false);
  const [dimensionProbeError, setDimensionProbeError] = useState<string | null>(
    null,
  );
  const [aspectRatioLocked, setAspectRatioLocked] = useState(true);
  const [resizeWidth, setResizeWidth] = useState(1);
  const [resizeHeight, setResizeHeight] = useState(1);
  const [antiAliasing, setAntiAliasing] = useState(true);
  const [lastChangedResizeAxis, setLastChangedResizeAxis] = useState<
    "width" | "height"
  >("width");
  const dimensionProbeId = useRef(0);
  const outputConversionSequences = useRef(new Map<string, number>());

  const [pngCompressionLevel, setPngCompressionLevel] = useState<number>(9);
  const [jpegQV, setJpegQV] = useState<number>(3);
  const [webpQV, setWebpQV] = useState<number>(75);
  const [gifFPS, setGifFPS] = useState<number>(15);
  const [gifMaxColors, setGifMaxColors] = useState<number>(256);
  const [videoCrf, setVideoCrf] = useState<number>(23);
  const [webmCrf, setWebmCrf] = useState<number>(31);
  const [aviQV, setAviQV] = useState<number>(3);

  const [audioCompression, setAudioCompression] =
    useState<AudioCompressionOptions>({
      bitrate: "128k",
      flacCompressionLevel: 5,
      vorbisQuality: 4,
      sampleRate: 0, // デフォルトを 「0: 自動(元ファイル維持)」に変更
      channels: 0, // デフォルトを 「0: 自動(元ファイル維持)」に変更
      pcmBitDepth: 16,
    });

  const isVideoOutput = VIDEO_FORMATS.includes(convertedFormat as VideoFormat);

  // 詳細パネルの開閉ではなく、実際に変換結果へ影響する設定だけを比較する。
  const conversionSettingsKey = JSON.stringify({
    convertedFormat,
    resize:
      !isAudioFormat(convertedFormat) && mediaDimensions
        ? {
            width: resizeWidth,
            height: resizeHeight,
            aspectRatioLocked,
            antiAliasing,
          }
        : null,
    pngCompressionLevel,
    jpegQV,
    webpQV,
    gifFPS,
    gifMaxColors,
    videoCrf,
    webmCrf,
    aviQV,
    audioCompression,
  });
  const conversionSettingsChanged =
    convertedFilePath !== null &&
    convertedFileName !== null &&
    convertedSettingsKey !== conversionSettingsKey;

  const availableOutputFormats = useMemo<Format[]>(() => {
    if (!sourceFormat) {
      return [];
    }

    if (sourceFormat === "GIF") {
      return [...IMAGE_FORMATS, ...VIDEO_FORMATS];
    }

    if (VIDEO_FORMATS.includes(sourceFormat as VideoFormat)) {
      return [...VIDEO_FORMATS, "GIF", ...AUDIO_FORMATS];
    }

    if (AUDIO_FORMATS.includes(sourceFormat as AudioFormat)) {
      return [...AUDIO_FORMATS];
    }

    return [...IMAGE_FORMATS];
  }, [sourceFormat]);

  // 古い一時ファイルを破棄するヘルパー
  const cleanupOldTempFile = useCallback((filePath: string | null) => {
    if (filePath) {
      if (isTauri()) {
        invoke("cleanup_temp_file", { path: filePath }).catch(console.error);
      } else if (filePath.startsWith("blob:")) {
        URL.revokeObjectURL(filePath);
      }
    }
  }, []);

  // ファイルまたはパスを受け取って内部状態を更新し、メディア情報の計測を行う共通処理
  const processSelectedInput = useCallback(
    async (input: string | File) => {
      const isFile = input instanceof File;
      const fileName = isFile ? input.name : (input.split(/[/\\]/).pop() ?? input);
      const detectedFormat = detectFormatFromPath(fileName);

      if (!detectedFormat) {
        setError(
          t("unsupportedFormat", {
            type: getExtensionFromPath(fileName),
            formats: SUPPORTED_FORMATS.join(", "),
          }),
        );
        return;
      }

      const filePath = isFile ? URL.createObjectURL(input) : input;
      console.log(
        `fileName: ${fileName},\nfilePath: ${filePath},\ndetectedFormat: ${detectedFormat}`,
      );
      setSourceFileName(fileName);
      setSourceFilePath((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return filePath;
      });
      setSourceFileType(detectedFormat);
      setSourceFileObj(isFile ? input : null);

      // 新しいファイルが選ばれたら旧一時ファイルを消去
      setConvertedFilePath((prevPath) => {
        cleanupOldTempFile(prevPath);
        return null;
      });
      setConvertedFileName(null);
      setConvertedFileFormat(null);
      setConvertedSettingsKey(null);
      setError(null);
      setMediaDimensions(null);
      setDimensionProbeError(null);
      setAspectRatioLocked(true);
      setAntiAliasing(true);
      setLastChangedResizeAxis("width");

      const probeId = ++dimensionProbeId.current;

      if (detectedFormat === "GIF") {
        setConvertedFormat("MP4");
      } else if (VIDEO_FORMATS.includes(detectedFormat as VideoFormat)) {
        setConvertedFormat("GIF");
      } else if (AUDIO_FORMATS.includes(detectedFormat as AudioFormat)) {
        setConvertedFormat("MP3");
      } else {
        setConvertedFormat("PNG");
      }

      if (AUDIO_FORMATS.includes(detectedFormat as AudioFormat)) {
        setIsProbingDimensions(false);
        return;
      }

      setIsProbingDimensions(true);

      try {
        let dimensions: MediaDimensions;
        if (isFile) {
          if (
            detectedFormat === "GIF" ||
            IMAGE_FORMATS.includes(detectedFormat as ImageFormat)
          ) {
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject(new Error("Image load failed"));
              img.src = filePath;
            });
            dimensions = { width: img.naturalWidth, height: img.naturalHeight };
          } else {
            const video = document.createElement("video");
            video.preload = "metadata";
            await new Promise<void>((resolve, reject) => {
              video.onloadedmetadata = () => resolve();
              video.onerror = () =>
                reject(new Error("Video metadata load failed"));
              video.src = filePath;
            });
            dimensions = { width: video.videoWidth, height: video.videoHeight };
          }
        } else {
          const probePath = await createTauriTempPath("probe", "png");
          try {
            await invoke("run_ffmpeg", {
              args: buildProbeArgs(filePath, probePath),
            });
            dimensions = parsePngDimensions(await readFile(probePath));
          } finally {
            await invoke("cleanup_temp_file", { path: probePath }).catch(
              console.error,
            );
          }
        }

        if (probeId !== dimensionProbeId.current) return;

        setMediaDimensions(dimensions);
        setResizeWidth(clampDimension(dimensions.width));
        setResizeHeight(clampDimension(dimensions.height));
      } catch (probeError) {
        if (probeId !== dimensionProbeId.current) return;
        setDimensionProbeError(
          `サイズの取得に失敗しました: ${String(probeError)}`,
        );
      } finally {
        if (probeId === dimensionProbeId.current) {
          setIsProbingDimensions(false);
        }
      }
    },
    [cleanupOldTempFile, t],
  );

  // ネイティブまたはブラウザのファイル選択ダイアログを開く
  const selectFileWithDialog = async () => {
    if (!isTauri()) {
      fileInputRef.current?.click();
      return;
    }

    try {
      const selected = await open({
        multiple: false,
        directory: false,
      });

      if (selected && typeof selected === "string") {
        await processSelectedInput(selected);
      }
    } catch (err) {
      setError(t("fileSelectError", { error: String(err) }));
    }
  };

  // Tauri の Drag & Drop イベントリスナーを登録
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;

    const setupDragDrop = async () => {
      unlisten = await getCurrentWebview().onDragDropEvent((event) => {
        if (event.payload.type === "drop") {
          const paths = event.payload.paths;
          if (paths && paths.length > 0) {
            processSelectedInput(paths[0]);
          }
        }
      });
    };

    setupDragDrop();

    return () => {
      if (unlisten) unlisten();
    };
  }, [processSelectedInput]);

  const buildConversionOptions = () => {
    const resizeOptions =
      !isAudioFormat(convertedFormat) && mediaDimensions
        ? {
            width: resizeWidth,
            height: resizeHeight,
            antiAliasing,
          }
        : {};

    switch (convertedFormat) {
      case "PNG":
        return {
          ...resizeOptions,
          compressionLevel: pngCompressionLevel,
        };
      case "JPEG":
        return {
          ...resizeOptions,
          qVJpeg: jpegQV,
        };
      case "WebP":
        return {
          ...resizeOptions,
          qVWebp: webpQV,
        };
      case "GIF":
        return {
          ...resizeOptions,
          fps: gifFPS,
          maxColors: gifMaxColors,
        };
      case "MP4":
      case "MOV":
        return {
          ...resizeOptions,
          crf: videoCrf,
        };
      case "WebM":
        return {
          ...resizeOptions,
          crfVp9: webmCrf,
        };
      case "AVI":
        return {
          ...resizeOptions,
          qVAvi: aviQV,
        };
      default:
        if (isAudioFormat(convertedFormat)) {
          const commonAudio = {
            sampleRate:
              audioCompression.sampleRate > 0
                ? audioCompression.sampleRate
                : undefined,
            channels:
              audioCompression.channels > 0
                ? audioCompression.channels
                : undefined,
          };

          switch (convertedFormat) {
            case "MP3":
            case "M4A":
            case "AAC":
            case "WMA":
            case "OPUS":
              return {
                audio: {
                  ...commonAudio,
                  bitrate: audioCompression.bitrate,
                },
              };

            case "FLAC":
              return {
                audio: {
                  ...commonAudio,
                  flacCompressionLevel: audioCompression.flacCompressionLevel,
                },
              };

            case "OGG":
              return {
                audio: {
                  ...commonAudio,
                  vorbisQuality: audioCompression.vorbisQuality,
                },
              };

            case "WAV":
            case "AIFF":
              return {
                audio: {
                  ...commonAudio,
                  pcmBitDepth: audioCompression.pcmBitDepth,
                },
              };
          }
        }
    }

    return undefined;
  };

  const cancelConversion = async () => {
    try {
      if (isTauri()) {
        await invoke("cancel_conversion");
      } else if (ffmpegRef.current) {
        ffmpegRef.current.terminate();
        ffmpegRef.current = null;
        setIsConverting(false);
      }
    } catch (cancelError) {
      console.error(t("cancelFailed"), cancelError);
    }
  };

  const convertFile = async () => {
    if (!sourceFilePath || !sourceFileName || !sourceFormat) return;

    const settingsKeyAtConversion = conversionSettingsKey;
    setIsConverting(true);
    setError(null);

    try {
      const extension = formatToExtension(convertedFormat);
      const inputExtension = formatToExtension(sourceFormat);
      const stem = sourceFileName.replace(/\.[^.]+$/, "");

      let outputTempPath: string;
      if (isTauri()) {
        outputTempPath = await createTauriTempPath("conversion", extension);
        await invoke("run_ffmpeg", {
          args: buildFfmpegArgs(
            sourceFilePath,
            outputTempPath,
            sourceFormat,
            convertedFormat,
            buildConversionOptions(),
          ),
        });
      } else {
        if (!sourceFileObj) throw new Error("No source file");

        if (!ffmpegRef.current) {
          ffmpegRef.current = new FFmpeg();
        }
        const ffmpeg = ffmpegRef.current;
        if (!ffmpeg.loaded) {
          const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";
          await ffmpeg.load({
            coreURL: await toBlobURL(
              `${baseURL}/ffmpeg-core.js`,
              "text/javascript",
            ),
            wasmURL: await toBlobURL(
              `${baseURL}/ffmpeg-core.wasm`,
              "application/wasm",
            ),
          });
        }

        const inputName = `input.${inputExtension}`;
        const outputName = `output.${extension}`;

        const fileData = await sourceFileObj.arrayBuffer();
        await ffmpeg.writeFile(inputName, new Uint8Array(fileData));

        const args = buildFfmpegArgs(
          inputName,
          outputName,
          sourceFormat,
          convertedFormat,
          buildConversionOptions(),
        );

        await ffmpeg.exec(args);
        const outputData = await ffmpeg.readFile(outputName);
        const mimeType =
          mimeTypes[convertedFormat][0] || "application/octet-stream";
        const blob = new Blob([outputData as BlobPart], { type: mimeType });
        outputTempPath = URL.createObjectURL(blob);
      }

      const sequenceKey = stem;
      const sequence =
        (outputConversionSequences.current.get(sequenceKey) ?? 0) + 1;
      outputConversionSequences.current.set(sequenceKey, sequence);
      const outputName = `${stem}_${sequence}.${extension}`;

      cleanupOldTempFile(convertedFilePath);

      setConvertedFilePath(outputTempPath);
      setConvertedFileName(outputName);
      setConvertedFileFormat(convertedFormat);
      setConvertedSettingsKey(settingsKeyAtConversion);
    } catch (error) {
      setError(apiErrorMessage(error, t));
    } finally {
      setIsConverting(false);
    }
  };

  const saveFile = async () => {
    if (!convertedFilePath || !convertedFileName) return;

    try {
      if (isTauri()) {
        const destinationPath = await save({
          defaultPath: convertedFileName,
        });

        if (!destinationPath) {
          return;
        }

        await copyFile(convertedFilePath, destinationPath);
      } else {
        const a = document.createElement("a");
        a.href = convertedFilePath;
        a.download = convertedFileName;
        a.click();
      }
    } catch (error) {
      console.error(t("saveFailed"), error);
    }
  };

  const handleFormatChange = (newFormat: Format) => {
    setConvertedFormat(newFormat);

    if (mediaDimensions && VIDEO_FORMATS.includes(newFormat as VideoFormat)) {
      setResizeWidth(normalizeVideoDimension(resizeWidth));
      setResizeHeight(normalizeVideoDimension(resizeHeight));
    }
  };

  const normalizeOutputDimensions = (width: number, height: number) => {
    if (isVideoOutput) {
      return {
        width: normalizeVideoDimension(width),
        height: normalizeVideoDimension(height),
      };
    }

    return {
      width: clampDimension(width),
      height: clampDimension(height),
    };
  };

  const updateLockedDimensions = (value: number, axis: "width" | "height") => {
    if (!mediaDimensions) return;

    const ratio = mediaDimensions.width / mediaDimensions.height;
    let width = axis === "width" ? clampDimension(value) : resizeWidth;
    let height = axis === "height" ? clampDimension(value) : resizeHeight;

    if (axis === "width") {
      height = Math.round(width / ratio);
      if (height > MAX_DIMENSION) {
        height = MAX_DIMENSION;
        width = Math.round(height * ratio);
      }
    } else {
      width = Math.round(height * ratio);
      if (width > MAX_DIMENSION) {
        width = MAX_DIMENSION;
        height = Math.round(width / ratio);
      }
    }

    const normalized = normalizeOutputDimensions(width, height);
    setResizeWidth(normalized.width);
    setResizeHeight(normalized.height);
  };

  const handleResizeWidthChange = (value: number) => {
    setLastChangedResizeAxis("width");
    if (aspectRatioLocked) {
      updateLockedDimensions(value, "width");
      return;
    }
    setResizeWidth(
      isVideoOutput ? normalizeVideoDimension(value) : clampDimension(value),
    );
  };

  const handleResizeHeightChange = (value: number) => {
    setLastChangedResizeAxis("height");
    if (aspectRatioLocked) {
      updateLockedDimensions(value, "height");
      return;
    }
    setResizeHeight(
      isVideoOutput ? normalizeVideoDimension(value) : clampDimension(value),
    );
  };

  const handleAspectRatioLockedChange = (locked: boolean) => {
    setAspectRatioLocked(locked);
    if (locked) {
      updateLockedDimensions(
        lastChangedResizeAxis === "width" ? resizeWidth : resizeHeight,
        lastChangedResizeAxis,
      );
    }
  };

  return (
    <main
      className="
        flex min-h-screen flex-col
        bg-[radial-gradient(circle_at_50%_45%,#fff_0,#f6f8fc_57%)]
        font-['Noto_Sans_JP',sans-serif]
        text-[#263143]
        antialiased
      "
    >
      {/* Header */}
      <header
        className="
          flex h-17.5 shrink-0 items-center justify-between
          border-b border-[#e8ecf4]
          bg-white/80
          px-10.5
          max-[980px]:px-5.5
        "
      >
        <div
          className="
            flex items-center gap-2.75
            font-['Plus_Jakarta_Sans','Noto_Sans_JP',sans-serif]
            text-lg font-bold
            tracking-[-0.3px]
            text-[#1d2c43]
          "
        >
          <span
            className="
              grid size-7 place-items-center
              rounded-lg
              bg-linear-to-br from-[#5d75f6] to-[#8768ec]
              text-[15px] text-white
            "
          >
            H
          </span>
          {t("appName")}
        </div>

        <div className="flex items-center gap-3 text-xs text-[#8390a3]">
          <span
            className={[
              "size-1.75 rounded-full bg-[#aeb8c7]",
              isConverting &&
                "animate-[pulse_1s_infinite_alternate] bg-[#6578f7]",
            ]
              .filter(Boolean)
              .join(" ")}
          />

          {isConverting ? t("converting") : t("waiting")}
          <label className="flex items-center gap-1">
            <span className="sr-only">{t("language")}</span>
            <select
              value={locale}
              onChange={(event) =>
                setLocale(event.target.value as typeof locale)
              }
              className="rounded border border-[#dfe5ef] bg-white px-2 py-1 text-xs text-[#40506a]"
            >
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>
      </header>

      {/* Workspace */}
      <section
        className="
          mx-auto grid flex-1 items-center gap-7
          w-[min(1190px,calc(100%-96px))]
          grid-cols-[minmax(260px,1fr)_180px_minmax(260px,1fr)]
          py-12 pb-14.5

          max-[980px]:w-[min(680px,calc(100%-40px))]
          max-[980px]:grid-cols-1
          max-[980px]:gap-6
          max-[980px]:py-7.5
        "
        aria-label={t("conversionWorkspace")}
      >
        {/* Input Panel */}
        <div
          className="
            min-h-99.5
            rounded-[20px]
            border border-[#e3e8f1]
            bg-white/90
            p-6.25
            shadow-[0_12px_35px_rgba(39,61,98,0.055)]

            max-[980px]:order-0
            max-[980px]:min-h-0
          "
        >
          <div className="mb-6.25 flex items-start gap-3">
            <span
              className="
                grid size-6.25 shrink-0 place-items-center
                rounded-full
                bg-[#eef1ff]
                font-['Plus_Jakarta_Sans',sans-serif]
                text-xs font-bold
                text-[#586cec]
              "
            >
              1
            </span>

            <div>
              <h1 className="mb-0.75 text-base font-bold text-[#26354a]">
                {t("sourceTitle")}
              </h1>

              <p className="m-0 text-xs text-[#99a4b5]">{t("sourceHint")}</p>
            </div>
          </div>

          <button
            type="button"
            className="
              relative flex h-70 w-full cursor-pointer
              overflow-hidden
              flex-col items-center justify-center
              rounded-[14px]
              border-[1.5px] border-dashed
              border-[#9eabff]
              bg-[#fafbff]
              p-6
              text-[#657184]
              transition duration-200
              hover:border-[#6477f6]
              hover:bg-[#f4f6ff]

              max-[980px]:h-57.5
            "
            onClick={selectFileWithDialog}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) {
                processSelectedInput(file);
              }
            }}
          >
            <MediaPreview path={sourceFilePath} format={sourceFormat} />

            <span className="relative flex w-full flex-col items-center">
            <span
              className="
                grid size-12 place-items-center
                rounded-[14px]
                bg-[#ebefff]
                text-[#6276f7]
              "
            >
              <img src={UploadIcon} alt="" />
            </span>

            <strong
              className="
                mt-3.5 mb-1.25
                max-w-full
                overflow-hidden
                text-ellipsis
                whitespace-nowrap
                text-sm
                text-[#3c4a60]
              "
            >
              {sourceFileName ?? t("dropFile")}
            </strong>

            <span className="text-xs">
              {sourceFilePath ? t("chooseAnother") : t("chooseFile")}
            </span>
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                processSelectedInput(file);
              }
              e.target.value = "";
            }}
          />

          {error && (
            <p className="my-2 text-[11px] leading-[1.6] text-[#d76269]">
              {error}
            </p>
          )}
        </div>

        {/* Conversion Flow */}
        <div
          className="
            relative flex flex-col items-center self-center pb-3

            max-[980px]:order-1
          "
        >
          <label
            htmlFor="format"
            className="mb-1.75 text-[11px] text-[#94a0b3]"
          >
            {t("outputFormat")}
          </label>

          <FormatDropdown
            value={convertedFormat}
            options={availableOutputFormats}
            disabled={!sourceFilePath}
            onChange={handleFormatChange}
          />

          <img
            src={ArrowIcon}
            alt=""
            aria-hidden="true"
            className="mt-7 w-30 max-[980px]:rotate-90"
          />

          <p
            className={`
              mt-3.5 text-xs text-[#9aa6b7]

              max-[980px]:absolute
              max-[980px]:bottom-0
              ${!sourceFilePath ? "invisible" : ""}
            `}
          >
            {t("convertTo", { format: convertedFormat })}
          </p>

          {isConverting ? (
            <button
              type="button"
              className="
                mt-6.25
                min-w-31.5
                rounded-[9px]
                border border-[#d76269]
                bg-white
                px-4
                py-2.75
                text-xs
                font-bold
                text-[#d76269]
                transition duration-200
                hover:bg-[#fff5f5]
              "
              onClick={cancelConversion}
            >
              {t("cancel")}
            </button>
          ) : (
            <button
              type="button"
              className="
                mt-6.25
                min-w-31.5
                rounded-[9px]
                border-0
                bg-linear-to-br from-[#6177f6] to-[#7c69e9]
                px-4
                py-2.75
                text-xs
                font-bold
                text-white
                shadow-[0_5px_13px_rgba(93,111,232,0.22)]
                transition duration-200
                hover:-translate-y-px
                hover:brightness-[1.04]
                disabled:cursor-not-allowed
                disabled:bg-[#c7ceda]
                disabled:bg-none
                disabled:shadow-none
                disabled:transform-none
              "
              onClick={convertFile}
              disabled={!sourceFilePath}
            >
              {conversionSettingsChanged
                ? t("reconvertChanged")
                : convertedFileName && convertedFilePath
                  ? t("convertAgain")
                  : t("convert")}
            </button>
          )}
        </div>

        {/* Output Panel */}
        <div
          className="
            min-h-99.5
            rounded-[20px]
            border border-[#e3e8f1]
            bg-white/90
            p-6.25
            shadow-[0_12px_35px_rgba(39,61,98,0.055)]

            max-[980px]:order-2
            max-[980px]:min-h-0
          "
        >
          <div className="mb-6.25 flex items-start gap-3">
            <span
              className="
                grid size-6.25 shrink-0 place-items-center
                rounded-full
                bg-[#eef1ff]
                font-['Plus_Jakarta_Sans',sans-serif]
                text-xs font-bold
                text-[#586cec]
              "
            >
              2
            </span>

            <div>
              <h2 className="mb-0.75 text-base font-bold text-[#26354a]">
                {t("outputTitle")}
              </h2>

              <p className="m-0 text-xs text-[#99a4b5]">{t("outputHint")}</p>
            </div>
          </div>

          <div
            className={[
              "relative flex h-70 flex-col items-center justify-center overflow-hidden rounded-[14px] border bg-[#fcfdff] p-5.5 text-center text-[#8e9aab] max-[980px]:h-57.5",
              convertedFilePath
                ? "border-[#dce3ff] bg-[#fbfcff]"
                : "border-[#edf0f5]",
            ].join(" ")}
          >
            <MediaPreview path={convertedFilePath} format={convertedFormat} />

            <div className="relative flex w-full flex-col items-center">
            <span
              className="
                grid size-12 place-items-center
                rounded-[14px]
                bg-[#f0f3f7]
                text-[#a9b4c4]
              "
            >
              <img src={FileIcon} alt="" />
            </span>

            <strong
              className="
                mt-3.5 mb-1.25
                max-w-full
                overflow-hidden
                text-ellipsis
                whitespace-nowrap
                text-sm
                text-[#3c4a60]
              "
            >
              {convertedFileName ?? t("noOutput")}
            </strong>

            <span className="text-xs">
              {convertedFilePath
                ? `${t("formatLabel", { format: convertedFileFormat ?? "" })}`
                : t("addAndConvert")}
            </span>

            {convertedFilePath && (
              <button
                type="button"
                className="
                  mt-4.5
                  rounded-[9px]
                  border-0
                  bg-linear-to-br from-[#6177f6] to-[#7c69e9]
                  px-3.75
                  py-2.25
                  text-xs
                  font-bold
                  text-white
                  shadow-[0_5px_13px_rgba(93,111,232,0.22)]
                  transition duration-200
                  hover:-translate-y-px
                  hover:brightness-[1.04]
                "
                onClick={saveFile}
              >
                {t("saveFile")}
              </button>
            )}
            </div>
          </div>
        </div>
      </section>

      {/* Details */}
      <footer
        className="
          mx-auto mb-5.5
          w-[min(1190px,calc(100%-96px))]
          overflow-hidden
          rounded-xl
          border border-[#e2e7f0]
          bg-white/85

          max-[980px]:w-[calc(100%-40px)]
        "
      >
        <button
          type="button"
          className="
            h-11.5
            w-full
            cursor-pointer
            border-0
            bg-transparent
            px-4.5
            text-left
            text-xs
            font-semibold
            text-[#5b687c]
          "
          onClick={() => setDetailsOpen(!detailsOpen)}
          aria-expanded={detailsOpen}
        >
          <span
            className={[
              "mr-2.25 inline-block text-sm text-[#8491a3]",
              detailsOpen ? "rotate-0" : "rotate-180",
            ].join(" ")}
          >
            ⌃
          </span>
          {t("details")}
        </button>

        {detailsOpen && (
          <div className="border-t border-[#edf0f5] px-5.5 py-4">
            {sourceFilePath && !isAudioFormat(convertedFormat) ? (
              <div className="flex flex-col gap-5">
                <ResizeOptions
                  dimensions={mediaDimensions}
                  aspectRatioLocked={aspectRatioLocked}
                  antiAliasing={antiAliasing}
                  width={resizeWidth}
                  height={resizeHeight}
                  isLoading={isProbingDimensions}
                  error={dimensionProbeError}
                  onAspectRatioLockedChange={handleAspectRatioLockedChange}
                  onAntiAliasingChange={setAntiAliasing}
                  onWidthChange={handleResizeWidthChange}
                  onHeightChange={handleResizeHeightChange}
                />

                <div className="h-px w-full bg-[#edf0f5]" />

                {IMAGE_FORMATS.includes(convertedFormat as ImageFormat) ? (
                  <ImageOptions
                    format={convertedFormat as ImageFormat}
                    sourceFormat={sourceFormat}
                    pngCompressionLevel={pngCompressionLevel}
                    onPngCompressionLevelChange={setPngCompressionLevel}
                    jpegQV={jpegQV}
                    onJpegQVChange={setJpegQV}
                    webpQV={webpQV}
                    onWebpQVChange={setWebpQV}
                    gifFPS={gifFPS}
                    onGifFPSChange={setGifFPS}
                    gifMaxColors={gifMaxColors}
                    onGifMaxColorsChange={setGifMaxColors}
                  />
                ) : (
                  <VideoOptions
                    format={convertedFormat as VideoFormat}
                    videoCrf={videoCrf}
                    onVideoCrfChange={setVideoCrf}
                    webmCrf={webmCrf}
                    onWebmCrfChange={setWebmCrf}
                    aviQV={aviQV}
                    onAviQVChange={setAviQV}
                  />
                )}
              </div>
            ) : isAudioFormat(convertedFormat) ? (
              <AudioOptions
                format={convertedFormat}
                options={audioCompression}
                onChange={setAudioCompression}
              />
            ) : (
              <p className="text-xs text-[#9aa6b7]">
                {sourceFilePath ? t("noOptions") : t("chooseForOptions")}
              </p>
            )}
          </div>
        )}
      </footer>
    </main>
  );
}

export default App;
