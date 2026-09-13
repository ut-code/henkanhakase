import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { useMemo, useRef, useState } from "react";
import ArrowIcon from "./assets/arrow.svg";
import FileIcon from "./assets/file.svg";
import UploadIcon from "./assets/upload.svg";
import {
  IMAGE_FORMATS,
  VIDEO_FORMATS,
  AUDIO_FORMATS,
  SUPPORTED_FORMATS,
  type ImageFormat,
  type VideoFormat,
  type AudioFormat,
  type Format,
  type AudioCompressionOptions,
  type MediaDimensions,
  mimeTypes,
  formatToExtension,
  isAudioFormat,
} from "./formats.ts";
import { AudioOptions } from "./components/AudioOptions";
import { ImageOptions } from "./components/ImageOptions";
import { VideoOptions } from "./components/VideoOptions";
import { ResizeOptions } from "./components/ResizeOptions";

const MAX_DIMENSION = 16384;

function clampDimension(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_DIMENSION, Math.max(1, Math.round(value)));
}

function normalizeVideoDimension(value: number): number {
  const clamped = clampDimension(value);
  if (clamped % 2 === 0) return clamped;
  return Math.min(MAX_DIMENSION, clamped + 1);
}

function App() {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [convertedFile, setConvertedFile] = useState<File | null>(null);
  const sourceFormat = useMemo<Format | null>(
    () =>
      sourceFile
        ? (Object.keys(mimeTypes).find((format) =>
            mimeTypes[format as Format].includes(sourceFile.type),
          ) as Format)
        : null,
    [sourceFile],
  );
  const [convertedFormat, setConvertedFormat] = useState<Format>("PNG");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaDimensions, setMediaDimensions] =
    useState<MediaDimensions | null>(null);
  const [isProbingDimensions, setIsProbingDimensions] = useState(false);
  const [dimensionProbeError, setDimensionProbeError] = useState<string | null>(
    null,
  );
  const [resizeEnabled, setResizeEnabled] = useState(false);
  const [aspectRatioLocked, setAspectRatioLocked] = useState(true);
  const [resizeWidth, setResizeWidth] = useState(1);
  const [resizeHeight, setResizeHeight] = useState(1);
  const [lastChangedResizeAxis, setLastChangedResizeAxis] = useState<
    "width" | "height"
  >("width");
  const dimensionProbeId = useRef(0);

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

  const fileInput = useRef<HTMLInputElement>(null);

  const isVideoOutput = VIDEO_FORMATS.includes(
    convertedFormat as VideoFormat,
  );

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

  const selectFile = async (file?: File) => {
    if (!file) return;

    const detectedFormat = Object.keys(mimeTypes).find((format) =>
      mimeTypes[format as Format].includes(file.type),
    ) as Format | undefined;

    if (!detectedFormat) {
      setError(
        `${file.type} はサポートされていない形式です。対応形式：${SUPPORTED_FORMATS.join(", ")}`,
      );
      return;
    }

    setSourceFile(file);
    setConvertedFile(null);
    setError(null);
    setMediaDimensions(null);
    setDimensionProbeError(null);
    setResizeEnabled(false);
    setAspectRatioLocked(true);
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
      const buffer = await file.arrayBuffer();
      const dimensions = await invoke<MediaDimensions>(
        "probe_media_dimensions",
        {
          request: {
            data: Array.from(new Uint8Array(buffer)),
            inputFormat: formatToExtension(detectedFormat),
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
  };

  const buildConversionOptions = () => {
    const resizeOptions =
      resizeEnabled && !isAudioFormat(convertedFormat)
        ? { width: resizeWidth, height: resizeHeight }
        : {};

    if (!detailsOpen) {
      return resizeEnabled ? resizeOptions : undefined;
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
          // sampleRateやchannelsが 0 (Auto) の場合は undefined にし、Rust/FFmpeg側で引数を省略できるようにする
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

  const convertFile = async () => {
    if (!sourceFile || !sourceFormat) return;

    setIsConverting(true);
    setError(null);

    try {
      const extension = formatToExtension(convertedFormat);
      const inputExtension = formatToExtension(sourceFormat);

      const stem = sourceFile.name.replace(/\.[^.]+$/, "");

      const buffer = await sourceFile.arrayBuffer();

      const result = await invoke<number[] | Uint8Array>("convert_file", {
        request: {
          data: Array.from(new Uint8Array(buffer)),
          stem,
          inputFormat: inputExtension,
          outputFormat: extension,

          options: buildConversionOptions(),
        },
      });

      const uint8Array =
        result instanceof Uint8Array ? result : new Uint8Array(result);

      setConvertedFile(
        new File([uint8Array as BlobPart], `${stem}.${extension}`, {
          type: mimeTypes[convertedFormat][0] || `application/octet-stream`,
        }),
      );
    } catch (error) {
      setError(
        `Error during conversion: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      setIsConverting(false);
    }
  };

  const saveFile = async () => {
    if (!convertedFile) return;

    try {
      const filePath = await save({
        defaultPath: convertedFile.name,
      });

      if (!filePath) {
        return;
      }

      const buffer = await convertedFile.arrayBuffer();

      await writeFile(filePath, new Uint8Array(buffer));
    } catch (error) {
      console.error("ファイルの保存に失敗しました:", error);
    }
  };

  const handleFormatChange = (newFormat: Format) => {
    setConvertedFormat(newFormat);
    setConvertedFile(null);

    if (resizeEnabled && VIDEO_FORMATS.includes(newFormat as VideoFormat)) {
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
      isVideoOutput
        ? normalizeVideoDimension(value)
        : clampDimension(value),
    );
  };

  const handleResizeHeightChange = (value: number) => {
    setLastChangedResizeAxis("height");
    if (aspectRatioLocked) {
      updateLockedDimensions(value, "height");
      return;
    }
    setResizeHeight(
      isVideoOutput
        ? normalizeVideoDimension(value)
        : clampDimension(value),
    );
  };

  const handleResizeEnabledChange = (enabled: boolean) => {
    setResizeEnabled(enabled);
    if (!enabled || !mediaDimensions) return;

    const normalized = normalizeOutputDimensions(
      mediaDimensions.width,
      mediaDimensions.height,
    );
    setResizeWidth(normalized.width);
    setResizeHeight(normalized.height);
    setLastChangedResizeAxis("width");
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

  const handleDrop = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    selectFile(event.dataTransfer.files[0]);
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
          変換はかせ
        </div>

        <div className="flex items-center gap-1.75 text-xs text-[#8390a3]">
          <span
            className={[
              "size-1.75 rounded-full bg-[#aeb8c7]",
              isConverting &&
                "animate-[pulse_1s_infinite_alternate] bg-[#6578f7]",
            ]
              .filter(Boolean)
              .join(" ")}
          />

          {isConverting ? "変換中" : "変換待機中"}
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
        aria-label="ファイル変換"
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
                変換するファイル
              </h1>

              <p className="m-0 text-xs text-[#99a4b5]">
                ファイルを追加してください
              </p>
            </div>
          </div>

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
            onClick={() => fileInput.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <span
              className="
                grid size-12 place-items-center
                rounded-[14px]
                bg-[#ebefff]
                text-[#6276f7]
              "
            >
              <img src={UploadIcon} alt="Upload" />
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
              {sourceFile?.name ?? "ファイルをここにドロップ"}
            </strong>

            <span className="text-xs">
              {sourceFile ? "別のファイルを選択" : "または、クリックして選択"}
            </span>
          </button>

          <input
            ref={fileInput}
            type="file"
            hidden
            accept={[...Object.values(mimeTypes).flat()].join(",")}
            onChange={(event) => selectFile(event.target.files?.[0])}
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
            変換形式
          </label>

          <select
            id="format"
            value={convertedFormat}
            disabled={!sourceFile}
            onChange={(event) =>
              handleFormatChange(event.target.value as Format)
            }
            className="
              w-31.5
              rounded-[9px]
              border border-[#dfe5ef]
              bg-white
              px-3.75
              py-2.5
              pr-7.75
              text-[13px]
              font-semibold
              text-[#40506a]
              outline-[#6578f7]
            "
          >
            {availableOutputFormats.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

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
              ${!sourceFile ? "invisible" : ""}
            `}
          >
            <b className="text-[#596ff1]">{convertedFormat}</b> に変換
          </p>

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
            disabled={!sourceFile || isConverting}
          >
            {isConverting ? "変換中…" : "変換を開始"}
          </button>
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
                変換後のファイル
              </h2>

              <p className="m-0 text-xs text-[#99a4b5]">
                変換結果がここに表示されます
              </p>
            </div>
          </div>

          <div
            className={[
              "flex h-70 flex-col items-center justify-center rounded-[14px] border bg-[#fcfdff] p-5.5 text-center text-[#8e9aab] max-[980px]:h-57.5",
              convertedFile
                ? "border-[#dce3ff] bg-[#fbfcff]"
                : "border-[#edf0f5]",
            ].join(" ")}
          >
            <span
              className="
                grid size-12 place-items-center
                rounded-[14px]
                bg-[#f0f3f7]
                text-[#a9b4c4]
              "
            >
              <img src={FileIcon} alt="File" />
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
              {convertedFile?.name ?? "まだ変換されたファイルはありません"}
            </strong>

            <span className="text-xs">
              {convertedFile
                ? `${Math.ceil(
                    convertedFile.size / 1024,
                  ).toLocaleString()} KB ・ ${convertedFormat} 形式`
                : "ファイルを追加して変換を開始してください"}
            </span>

            {convertedFile && (
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
                ファイルに保存
              </button>
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
          詳細
        </button>

        {detailsOpen && (
          <div className="border-t border-[#edf0f5] px-5.5 py-4">
            {sourceFile && !isAudioFormat(convertedFormat) ? (
              <div className="flex flex-col gap-5">
                <ResizeOptions
                  dimensions={mediaDimensions}
                  enabled={resizeEnabled}
                  aspectRatioLocked={aspectRatioLocked}
                  width={resizeWidth}
                  height={resizeHeight}
                  isLoading={isProbingDimensions}
                  error={dimensionProbeError}
                  onEnabledChange={handleResizeEnabledChange}
                  onAspectRatioLockedChange={handleAspectRatioLockedChange}
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
                {sourceFile
                  ? "この変換形式で設定可能な詳細オプションはありません"
                  : "ファイルを選択するとオプションを設定できます"}
              </p>
            )}
          </div>
        )}
      </footer>
    </main>
  );
}

export default App;
