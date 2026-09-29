import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open, save } from "@tauri-apps/plugin-dialog";
import { copyFile } from "@tauri-apps/plugin-fs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ArrowIcon from "./assets/arrow.svg";
import FileIcon from "./assets/file.svg";
import UploadIcon from "./assets/upload.svg";
import { AudioOptions } from "./components/AudioOptions";
import { FormatDropdown } from "./components/FormatDropdown";
import { ImageOptions } from "./components/ImageOptions";
import { MediaModal } from "./components/MediaModal";
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
import { detectFormatFromPath, getExtensionFromPath } from "./utils/path.ts";

interface SourceFileItem {
  id: string;
  name: string;
  path: string;
  format: Format;
}

interface ConvertedResultItem {
  id: string;
  sourceName: string;
  convertedFilePath: string | null;
  convertedFileName: string | null;
  convertedFileFormat: Format | null;
  error: string | null;
}

function App() {
  const { locale, setLocale, t } = useTranslation();

  // 複数ファイルを配列で管理
  const [sourceFiles, setSourceFiles] = useState<SourceFileItem[]>([]);
  const [convertedResults, setConvertedResults] = useState<
    ConvertedResultItem[]
  >([]);
  const [convertedSettingsKey, setConvertedSettingsKey] = useState<
    string | null
  >(null);

  // モーダルプレビュー用のステート
  const [modalItem, setModalItem] = useState<{
    path: string;
    format: Format;
    title: string;
  } | null>(null);

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
  const [resizeMode, setResizeMode] = useState<"individual" | "uniform">(
    "individual",
  );
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

  // 選択されているファイルの種別（画像・動画・音声）の混在チェック
  const mediaTypes = useMemo(() => {
    let hasImage = false;
    let hasVideo = false;
    let hasAudio = false;

    for (const file of sourceFiles) {
      if (
        file.format === "GIF" ||
        VIDEO_FORMATS.includes(file.format as VideoFormat)
      ) {
        hasVideo = true;
      } else if (AUDIO_FORMATS.includes(file.format as AudioFormat)) {
        hasAudio = true;
      } else {
        hasImage = true;
      }
    }

    return { hasImage, hasVideo, hasAudio };
  }, [sourceFiles]);

  const isMixedMediaType = useMemo(() => {
    const activeTypes = [
      mediaTypes.hasImage,
      mediaTypes.hasVideo,
      mediaTypes.hasAudio,
    ].filter(Boolean).length;

    return activeTypes > 1;
  }, [mediaTypes]);

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
            resizeMode,
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
    convertedResults.length > 0 &&
    convertedSettingsKey !== conversionSettingsKey;

  // 選択されているすべてのファイルに対応する出力フォーマット候補を出す
  const availableOutputFormats = useMemo<Format[]>(() => {
    if (sourceFiles.length === 0 || isMixedMediaType) return [];

    if (mediaTypes.hasVideo) return [...VIDEO_FORMATS, "GIF", ...AUDIO_FORMATS];
    if (mediaTypes.hasAudio) return [...AUDIO_FORMATS];
    return [...IMAGE_FORMATS];
  }, [sourceFiles, isMixedMediaType, mediaTypes]);

  // 古い一時ファイルを破棄するヘルパー
  const cleanupOldTempFiles = useCallback((results: ConvertedResultItem[]) => {
    for (const res of results) {
      if (res.convertedFilePath) {
        invoke("cleanup_temp_file", { path: res.convertedFilePath }).catch(
          console.error,
        );
      }
    }
  }, []);

  // メディアサイズなどの初期計測を行う関数
  const probeFileDimensions = useCallback(async (file: SourceFileItem) => {
    if (AUDIO_FORMATS.includes(file.format as AudioFormat)) {
      setIsProbingDimensions(false);
      setMediaDimensions(null);
      return;
    }

    setIsProbingDimensions(true);
    const probeId = ++dimensionProbeId.current;

    try {
      const dimensions = await invoke<MediaDimensions>(
        "probe_media_dimensions",
        {
          request: {
            inputPath: file.path,
            inputFormat: formatToExtension(file.format),
          },
        },
      );

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
  }, []);

  // 選択された複数ファイルパスを一度に受け取り処理する関数
  const processSelectedFilePaths = useCallback(
    async (filePaths: string[], append = false) => {
      if (!filePaths || filePaths.length === 0) return;

      const validFiles: SourceFileItem[] = [];
      const errors: string[] = [];

      for (const filePath of filePaths) {
        if (!filePath) continue;

        const fileName = filePath.split(/[/\\]/).pop() ?? filePath;
        const detectedFormat = detectFormatFromPath(filePath);

        if (!detectedFormat) {
          errors.push(
            t("unsupportedFormat", {
              type: getExtensionFromPath(filePath) || "unknown",
              formats: SUPPORTED_FORMATS.join(", "),
            }),
          );
          continue;
        }

        validFiles.push({
          id: `${filePath}-${Date.now()}-${Math.random()}`,
          name: fileName,
          path: filePath,
          format: detectedFormat,
        });
      }

      if (errors.length > 0) {
        setError(errors.join("\n"));
      } else {
        setError(null);
      }

      // 有効なファイルが1つもない場合はここで終了（クラッシュ防止）
      if (validFiles.length === 0) return;

      // 古い変換結果のクリア
      setConvertedResults((prev) => {
        cleanupOldTempFiles(prev);
        return [];
      });

      setConvertedSettingsKey(null);
      setDimensionProbeError(null);
      setAspectRatioLocked(true);
      setAntiAliasing(true);
      setLastChangedResizeAxis("width");

      // sourceFiles を更新し、その時点の最新配列を使って処理を行う
      setSourceFiles((prevFiles) => {
        const nextFiles = append ? [...prevFiles, ...validFiles] : validFiles;

        // 最初のファイルが存在する場合のみフォーマット切り替え & probe 実行
        const firstFile = nextFiles[0];
        if (firstFile?.format) {
          if (!append || prevFiles.length === 0) {
            if (firstFile.format === "GIF") {
              setConvertedFormat("MP4");
            } else if (
              VIDEO_FORMATS.includes(firstFile.format as VideoFormat)
            ) {
              setConvertedFormat("GIF");
            } else if (
              AUDIO_FORMATS.includes(firstFile.format as AudioFormat)
            ) {
              setConvertedFormat("MP3");
            } else {
              setConvertedFormat("PNG");
            }
            probeFileDimensions(firstFile);
          }
        }

        return nextFiles;
      });
    },
    [cleanupOldTempFiles, probeFileDimensions, t],
  );

  // ファイル削除処理
  const removeSourceFile = (id: string) => {
    setSourceFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      if (filtered.length > 0 && prev[0].id === id) {
        // 先頭ファイルが削除された場合、次の先頭ファイルで probe を再実行
        probeFileDimensions(filtered[0]);
      } else if (filtered.length === 0) {
        setMediaDimensions(null);
      }
      return filtered;
    });
  };

  // 一括クリア処理
  const clearAllSourceFiles = () => {
    setSourceFiles([]);
    setMediaDimensions(null);
    setConvertedResults((prev) => {
      cleanupOldTempFiles(prev);
      return [];
    });
  };

  const selectFileWithDialog = async (append = false) => {
    try {
      const selected = await open({
        multiple: true,
        directory: false,
      });

      if (Array.isArray(selected)) {
        await processSelectedFilePaths(selected, append);
      } else if (selected && typeof selected === "string") {
        await processSelectedFilePaths([selected], append);
      }
    } catch (err) {
      console.log(err);
      setError(t("fileSelectError", { error: String(err) }));
    }
  };

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupDragDrop = async () => {
      unlisten = await getCurrentWebview().onDragDropEvent((event) => {
        if (event.payload.type === "drop") {
          const paths = event.payload.paths;
          if (paths && paths.length > 0) {
            processSelectedFilePaths(paths, true);
          }
        }
      });
    };

    setupDragDrop();

    return () => {
      if (unlisten) unlisten();
    };
  }, [processSelectedFilePaths]);

  const buildConversionOptions = (
    targetFileDimensions?: MediaDimensions | null,
  ) => {
    let resizeOptions = {};

    if (!isAudioFormat(convertedFormat)) {
      if (resizeMode === "uniform" && mediaDimensions) {
        resizeOptions = {
          width: resizeWidth,
          height: resizeHeight,
          antiAliasing,
        };
      } else if (resizeMode === "individual" && targetFileDimensions) {
        if (aspectRatioLocked && mediaDimensions) {
          const scale = resizeWidth / mediaDimensions.width;
          let calculatedWidth = Math.round(targetFileDimensions.width * scale);
          let calculatedHeight = Math.round(
            targetFileDimensions.height * scale,
          );

          if (isVideoOutput) {
            calculatedWidth = normalizeVideoDimension(calculatedWidth);
            calculatedHeight = normalizeVideoDimension(calculatedHeight);
          } else {
            calculatedWidth = clampDimension(calculatedWidth);
            calculatedHeight = clampDimension(calculatedHeight);
          }

          resizeOptions = {
            width: calculatedWidth,
            height: calculatedHeight,
            antiAliasing,
          };
        } else {
          resizeOptions = {
            width: resizeWidth,
            height: resizeHeight,
            antiAliasing,
          };
        }
      } else if (mediaDimensions) {
        resizeOptions = {
          width: resizeWidth,
          height: resizeHeight,
          antiAliasing,
        };
      }
    }

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
      await invoke("cancel_conversion");
    } catch (cancelError) {
      console.error(t("cancelFailed"), cancelError);
    }
  };

  // 複数ファイルを一括で順次変換する処理
  const convertFiles = async () => {
    if (sourceFiles.length === 0 || isMixedMediaType) return;

    const settingsKeyAtConversion = conversionSettingsKey;
    setIsConverting(true);
    setError(null);

    // 一時ファイルのクリーンアップ
    cleanupOldTempFiles(convertedResults);
    setConvertedResults([]);

    const newResults: ConvertedResultItem[] = [];

    for (const file of sourceFiles) {
      try {
        const extension = formatToExtension(convertedFormat);
        const inputExtension = formatToExtension(file.format);
        const stem = file.name.replace(/\.[^.]+$/, "");

        let fileDimensions: MediaDimensions | null = null;
        if (!isAudioFormat(convertedFormat) && resizeMode === "individual") {
          try {
            fileDimensions = await invoke<MediaDimensions>(
              "probe_media_dimensions",
              {
                request: {
                  inputPath: file.path,
                  inputFormat: inputExtension,
                },
              },
            );
          } catch (probeErr) {
            console.warn("Probe error for file:", file.name, probeErr);
          }
        }

        const outputTempPath = await invoke<string>("convert_file", {
          request: {
            inputPath: file.path,
            stem,
            inputFormat: inputExtension,
            outputFormat: extension,
            options: buildConversionOptions(fileDimensions),
          },
        });

        const sequenceKey = stem;
        const sequence =
          (outputConversionSequences.current.get(sequenceKey) ?? 0) + 1;
        outputConversionSequences.current.set(sequenceKey, sequence);
        const outputName = `${stem}_${sequence}.${extension}`;

        newResults.push({
          id: file.id,
          sourceName: file.name,
          convertedFilePath: outputTempPath,
          convertedFileName: outputName,
          convertedFileFormat: convertedFormat,
          error: null,
        });
      } catch (err) {
        // 個別のエラーハンドリング：失敗してもループを中断しない
        newResults.push({
          id: file.id,
          sourceName: file.name,
          convertedFilePath: null,
          convertedFileName: null,
          convertedFileFormat: null,
          error: apiErrorMessage(err, t),
        });
      }
    }

    setConvertedResults(newResults);
    setConvertedSettingsKey(settingsKeyAtConversion);
    setIsConverting(false);
  };

  // 個別保存機能
  const saveSingleFile = async (res: ConvertedResultItem) => {
    if (!res.convertedFilePath || !res.convertedFileName) return;

    try {
      const savePath = await save({
        defaultPath: res.convertedFileName,
      });

      if (savePath && typeof savePath === "string") {
        await copyFile(res.convertedFilePath, savePath);
      }
    } catch (saveErr) {
      console.error(t("saveFailed"), saveErr);
    }
  };

  // 一括保存機能（フォルダ選択）
  const saveAllFiles = async () => {
    const validResults = convertedResults.filter(
      (r) => r.convertedFilePath && r.convertedFileName,
    );
    if (validResults.length === 0) return;

    try {
      const selectedDir = await open({
        directory: true,
        multiple: false,
      });

      if (!selectedDir || typeof selectedDir !== "string") return;

      for (const res of validResults) {
        if (res.convertedFilePath && res.convertedFileName) {
          const destinationPath = `${selectedDir}/${res.convertedFileName}`;
          await copyFile(res.convertedFilePath, destinationPath);
        }
      }
    } catch (saveErr) {
      console.error(t("saveFailed"), saveErr);
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

  const successfulConversionsCount = convertedResults.filter(
    (r) => r.convertedFilePath,
  ).length;

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
            flex min-h-99.5 flex-col
            rounded-[20px]
            border border-[#e3e8f1]
            bg-white/90
            p-6.25
            shadow-[0_12px_35px_rgba(39,61,98,0.055)]

            max-[980px]:order-0
            max-[980px]:min-h-0
          "
        >
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-start gap-3">
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

            {sourceFiles.length > 0 && (
              <button
                type="button"
                onClick={clearAllSourceFiles}
                className="cursor-pointer text-xs text-[#d76269] hover:underline"
              >
                全クリア
              </button>
            )}
          </div>

          {sourceFiles.length === 0 ? (
            <button
              type="button"
              className="
                flex h-70 w-full cursor-pointer
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
              onClick={() => selectFileWithDialog(false)}
            >
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
                {t("dropFile")}
              </strong>
              <span className="text-xs">{t("chooseFile")}</span>
            </button>
          ) : (
            <div className="flex flex-1 flex-col justify-between min-h-0">
              <div className="max-h-56 overflow-y-auto pr-1">
                <ul className="flex flex-col gap-2">
                  {sourceFiles.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between rounded-lg border border-[#e8ecf4] bg-[#fafbff] p-2 text-xs overflow-hidden"
                    >
                      <div className="flex min-w-0 items-center gap-2 pr-2 flex-1">
                        <button
                          type="button"
                          onClick={() =>
                            setModalItem({
                              path: f.path,
                              format: f.format,
                              title: f.name,
                            })
                          }
                          className="group relative size-10 shrink-0 cursor-pointer overflow-hidden rounded border border-[#dfe5ef] [&_img]:size-full [&_img]:object-cover [&_video]:size-full [&_video]:object-cover"
                          title="クリックで拡大表示"
                        >
                          <MediaPreview path={f.path} format={f.format} />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100 text-white text-[10px]">
                            🔍
                          </div>
                        </button>
                        <div className="truncate text-left flex-1 min-w-0">
                          <div className="font-medium text-[#3c4a60] truncate">
                            {f.name}
                          </div>
                          <div className="text-[10px] text-[#8e9aab]">
                            {f.format}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSourceFile(f.id)}
                        className="grid size-5 shrink-0 place-items-center rounded bg-[#eef2f7] text-[#8390a3] transition hover:bg-[#d76269] hover:text-white"
                        title="削除"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#edf0f5] pt-3 shrink-0">
                <span className="text-xs text-[#8390a3]">
                  計 {sourceFiles.length} 件
                </span>
                <button
                  type="button"
                  onClick={() => selectFileWithDialog(true)}
                  className="rounded-md border border-[#c1cbde] bg-white px-3 py-1.5 text-xs font-semibold text-[#40506a] transition hover:bg-[#f4f6ff]"
                >
                  + 追加
                </button>
              </div>
            </div>
          )}

          {isMixedMediaType && (
            <p className="my-2 whitespace-pre-line text-[11px] leading-[1.6] text-[#d76269]">
              画像・動画・音声ファイルが混ざっています。同じ種類のファイルのみ選択してください。
            </p>
          )}

          {error && (
            <p className="my-2 whitespace-pre-line text-[11px] leading-[1.6] text-[#d76269]">
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
            disabled={sourceFiles.length === 0 || isMixedMediaType}
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
              ${sourceFiles.length === 0 || isMixedMediaType ? "invisible" : ""}
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
              onClick={convertFiles}
              disabled={sourceFiles.length === 0 || isMixedMediaType}
            >
              {conversionSettingsChanged
                ? t("reconvertChanged")
                : convertedResults.length > 0
                  ? t("convertAgain")
                  : t("convert")}
            </button>
          )}
        </div>

        {/* Output Panel */}
        <div
          className="
            flex min-h-99.5 flex-col
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
              "flex flex-1 flex-col items-center justify-between rounded-[14px] border p-5.5 text-center text-[#8e9aab] min-h-0",
              convertedResults.length > 0
                ? "border-[#dce3ff] bg-[#fbfcff]"
                : "border-[#edf0f5] bg-[#fcfdff] justify-center",
            ].join(" ")}
          >
            {convertedResults.length === 0 ? (
              <>
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
                  {t("noOutput")}
                </strong>
                <span className="text-xs">{t("addAndConvert")}</span>
              </>
            ) : (
              <div className="flex w-full flex-1 flex-col justify-between min-h-0">
                <div className="flex flex-col min-h-0">
                  <strong className="block mb-3 text-sm text-[#3c4a60] shrink-0">
                    {successfulConversionsCount} / {convertedResults.length} 件
                    変換完了
                  </strong>

                  <div className="max-h-52 w-full overflow-y-auto pr-1">
                    <ul className="flex flex-col gap-2">
                      {convertedResults.map((res) => (
                        <li
                          key={res.id}
                          className="flex items-center justify-between rounded-lg border border-[#e8ecf4] bg-white p-2 text-xs overflow-hidden"
                        >
                          <div className="flex min-w-0 items-center gap-2 pr-2 flex-1">
                            {res.convertedFilePath ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setModalItem({
                                      path: res.convertedFilePath ?? "",
                                      format:
                                        res.convertedFileFormat ??
                                        convertedFormat,
                                      title: res.convertedFileName || "",
                                    })
                                  }
                                  className="group relative size-10 shrink-0 cursor-pointer overflow-hidden rounded border border-[#dfe5ef] [&_img]:size-full [&_img]:object-cover [&_video]:size-full [&_video]:object-cover"
                                  title="クリックで拡大表示"
                                >
                                  <MediaPreview
                                    path={res.convertedFilePath}
                                    format={
                                      res.convertedFileFormat ?? convertedFormat
                                    }
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100 text-white text-[10px]">
                                    🔍
                                  </div>
                                </button>
                                <div className="truncate text-left flex-1 min-w-0">
                                  <span className="text-[#3c4a60] font-medium block truncate">
                                    ✓ {res.convertedFileName}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="truncate text-left flex-1 min-w-0">
                                <span className="text-[#d76269] block truncate">
                                  ✕ {res.sourceName}: {res.error}
                                </span>
                              </div>
                            )}
                          </div>

                          {res.convertedFilePath && (
                            <button
                              type="button"
                              onClick={() => saveSingleFile(res)}
                              className="shrink-0 rounded bg-[#eef1ff] px-2 py-1 text-[11px] font-semibold text-[#586cec] transition hover:bg-[#6177f6] hover:text-white"
                            >
                              保存
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {successfulConversionsCount > 0 && (
                  <button
                    type="button"
                    className="
                      mt-4
                      w-full
                      shrink-0
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
                    onClick={saveAllFiles}
                  >
                    保存フォルダを選択して一括保存
                  </button>
                )}
              </div>
            )}
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
            {sourceFiles.length > 0 && !isAudioFormat(convertedFormat) ? (
              <div className="flex flex-col gap-5">
                {sourceFiles.length > 1 && (
                  <div className="flex flex-col gap-1.5 rounded-lg bg-[#fafbff] p-3 border border-[#e8ecf4]">
                    <span className="text-xs font-semibold text-[#3c4a60]">
                      複数ファイルのリサイズ処理:
                    </span>
                    <div className="flex items-center gap-4 text-xs text-[#5b687c]">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="resizeMode"
                          value="individual"
                          checked={resizeMode === "individual"}
                          onChange={() => setResizeMode("individual")}
                          className="accent-[#586cec]"
                        />
                        それぞれの縦横比で変換
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="resizeMode"
                          value="uniform"
                          checked={resizeMode === "uniform"}
                          onChange={() => setResizeMode("uniform")}
                          className="accent-[#586cec]"
                        />
                        最初のファイルの縦横比に固定
                      </label>
                    </div>
                  </div>
                )}

                {/* 複数ファイル時で「それぞれの縦横比で変換」が選ばれている場合はリサイズオプションを非表示 */}
                {(sourceFiles.length <= 1 || resizeMode === "uniform") && (
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
                )}

                <div className="h-px w-full bg-[#edf0f5]" />

                {IMAGE_FORMATS.includes(convertedFormat as ImageFormat) ? (
                  <ImageOptions
                    format={convertedFormat as ImageFormat}
                    sourceFormat={sourceFiles[0]?.format ?? null}
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
                {sourceFiles.length > 0
                  ? t("noOptions")
                  : t("chooseForOptions")}
              </p>
            )}
          </div>
        )}
      </footer>

      {/* Media Modal */}
      <MediaModal
        isOpen={Boolean(modalItem)}
        onClose={() => setModalItem(null)}
        path={modalItem?.path ?? null}
        format={modalItem?.format ?? null}
        title={modalItem?.title}
      />
    </main>
  );
}

export default App;
