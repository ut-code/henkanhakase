import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { useMemo, useRef, useState } from "react";

const IMAGE_FORMATS = ["PNG", "JPEG", "WebP", "GIF"] as const;
const VIDEO_FORMATS = ["MP4", "WebM", "AVI", "MOV"] as const;
const AUDIO_FORMATS = [
  "MP3",
  "M4A",
  "AAC",
  "WAV",
  "AIFF",
  "FLAC",
  "WMA",
  "OGG",
  "OPUS",
] as const;
const SUPPORTED_FORMATS = [
  ...IMAGE_FORMATS,
  ...VIDEO_FORMATS,
  ...AUDIO_FORMATS,
];
type ImageFormat = (typeof IMAGE_FORMATS)[number];
type VideoFormat = (typeof VIDEO_FORMATS)[number];
type AudioFormat = (typeof AUDIO_FORMATS)[number];
type Format = ImageFormat | VideoFormat | AudioFormat;

type AudioBitrate = "64k" | "96k" | "128k" | "160k" | "192k" | "256k" | "320k";

type AudioCompressionOptions = {
  bitrate: AudioBitrate;
  flacCompressionLevel: number;
  vorbisQuality: number;
  sampleRate: number; // 0 = 元ファイルのまま(Auto)
  channels: number; // 0 = 元ファイルのまま(Auto), 1 = モノラル, 2 = ステレオ
  pcmBitDepth: 16 | 24 | 32;
};

const mimeTypes: Record<Format, string[]> = {
  PNG: ["image/png", "image/x-png"],
  JPEG: ["image/jpeg", "image/pjpeg", "image/jpg"],
  WebP: ["image/webp"],
  GIF: ["image/gif"],

  MP4: ["video/mp4"],
  WebM: ["video/webm"],
  AVI: ["video/x-msvideo", "video/avi", "video/msvideo", "video/vnd.avi"],
  MOV: ["video/quicktime", "video/mov", "video/x-quicktime"],
  MP3: [
    "audio/mpeg",
    "audio/mp3",
    "audio/x-mpeg",
    "audio/x-mpeg-3",
    "audio/mpeg3",
  ],
  M4A: ["audio/mp4", "audio/x-m4a", "audio/m4a"],
  AAC: ["audio/aac", "audio/x-aac"],
  WAV: [
    "audio/wav",
    "audio/x-wav",
    "audio/wave",
    "audio/x-pn-wav",
    "audio/vnd.wave",
  ],
  AIFF: ["audio/aiff", "audio/x-aiff", "audio/aif", "audio/x-aifc"],
  FLAC: ["audio/flac", "audio/x-flac"],
  WMA: ["audio/x-ms-wma"],
  OGG: ["audio/ogg", "application/ogg"],
  OPUS: ["audio/opus"],
};

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-6 fill-none stroke-current stroke-[1.7] stroke-linecap-round stroke-linejoin-round"
    >
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-6 fill-none stroke-current stroke-[1.7] stroke-linecap-round stroke-linejoin-round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
    </svg>
  );
}

function formatToExtension(format: Format): string {
  switch (format) {
    case "JPEG":
      return "jpg";

    default:
      return format.toLowerCase();
  }
}

function isAudioFormat(format: Format | null): format is AudioFormat {
  return format !== null && AUDIO_FORMATS.includes(format as AudioFormat);
}

function isLossyAudioFormat(format: Format | null): boolean {
  return (
    format === "MP3" ||
    format === "M4A" ||
    format === "AAC" ||
    format === "WMA" ||
    format === "OGG" ||
    format === "OPUS"
  );
}

type AudioOptionsProps = {
  format: AudioFormat;
  options: AudioCompressionOptions;
  onChange: (options: AudioCompressionOptions) => void;
};

function AudioOptions({ format, options, onChange }: AudioOptionsProps) {
  const update = <K extends keyof AudioCompressionOptions>(
    key: K,
    value: AudioCompressionOptions[K],
  ) => {
    onChange({
      ...options,
      [key]: value,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 共通オプション：サンプルレート＆チャンネル数 */}
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
          <label
            htmlFor="audio-sample-rate"
            className="text-xs font-semibold text-[#415166]"
          >
            サンプルレート
          </label>
          <select
            id="audio-sample-rate"
            value={options.sampleRate}
            onChange={(e) => update("sampleRate", Number(e.target.value))}
            className="rounded-[9px] border border-[#dfe5ef] bg-white px-3 py-2 text-xs text-[#40506a] outline-[#6578f7]"
          >
            <option value={0}>自動 (元ファイルと同じ)</option>
            <option value={22050}>22.05 kHz</option>
            <option value={44100}>44.1 kHz</option>
            <option value={48000}>48 kHz</option>
            <option value={96000}>96 kHz (ハイレゾ)</option>
          </select>
        </div>

        <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
          <label
            htmlFor="audio-channels"
            className="text-xs font-semibold text-[#415166]"
          >
            チャンネル
          </label>
          <select
            id="audio-channels"
            value={options.channels}
            onChange={(e) => update("channels", Number(e.target.value))}
            className="rounded-[9px] border border-[#dfe5ef] bg-white px-3 py-2 text-xs text-[#40506a] outline-[#6578f7]"
          >
            <option value={0}>自動 (元ファイルと同じ)</option>
            <option value={1}>1 ch (モノラル)</option>
            <option value={2}>2 ch (ステレオ)</option>
          </select>
        </div>
      </div>

      <div className="h-px w-full bg-[#edf0f5]" />

      {/* フォーマット特有のオプション */}
      <div className="flex flex-wrap items-center gap-6">
        {(format === "WAV" || format === "AIFF") && (
          <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
            <label
              htmlFor="audio-bit-depth"
              className="text-xs font-semibold text-[#415166]"
            >
              ビット深度
            </label>
            <select
              id="audio-bit-depth"
              value={options.pcmBitDepth}
              onChange={(e) =>
                update("pcmBitDepth", Number(e.target.value) as 16 | 24 | 32)
              }
              className="rounded-[9px] border border-[#dfe5ef] bg-white px-3 py-2 text-xs text-[#40506a] outline-[#6578f7]"
            >
              <option value={16}>16 bit (CD標準)</option>
              <option value={24}>24 bit (高音質)</option>
              <option value={32}>32 bit (Float/高精度)</option>
            </select>
          </div>
        )}

        {format === "FLAC" && (
          <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="flac-compression"
                className="font-semibold text-[#415166]"
              >
                圧縮レベル（可逆圧縮）
              </label>
              <span className="rounded bg-[#eef1ff] px-2 py-0.5 font-['Plus_Jakarta_Sans',sans-serif] text-xs font-bold text-[#586cec]">
                {options.flacCompressionLevel}
              </span>
            </div>
            <input
              type="range"
              id="flac-compression"
              min="0"
              max="12"
              value={options.flacCompressionLevel}
              onChange={(e) =>
                update(
                  "flacCompressionLevel",
                  Number.parseInt(e.target.value, 10),
                )
              }
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#e3e8f1] accent-[#586cec]"
            />
            <div className="flex justify-between text-[10px] text-[#9aa6b7]">
              <span>0 (高速)</span>
              <span>12 (高圧縮)</span>
            </div>
          </div>
        )}

        {format === "OGG" && (
          <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="vorbis-quality"
                className="font-semibold text-[#415166]"
              >
                音質（Vorbis）
              </label>
              <span className="rounded bg-[#eef1ff] px-2 py-0.5 font-['Plus_Jakarta_Sans',sans-serif] text-xs font-bold text-[#586cec]">
                {options.vorbisQuality}
              </span>
            </div>
            <input
              type="range"
              id="vorbis-quality"
              min="-1"
              max="10"
              step="1"
              value={options.vorbisQuality}
              onChange={(e) =>
                update("vorbisQuality", Number.parseInt(e.target.value, 10))
              }
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#e3e8f1] accent-[#586cec]"
            />
            <div className="flex justify-between text-[10px] text-[#9aa6b7]">
              <span>-1 (低品質)</span>
              <span>10 (高品質)</span>
            </div>
          </div>
        )}

        {isLossyAudioFormat(format) && format !== "OGG" && (
          <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
            <label
              htmlFor="audio-bitrate"
              className="text-xs font-semibold text-[#415166]"
            >
              ビットレート
            </label>
            <select
              id="audio-bitrate"
              value={options.bitrate}
              onChange={(e) =>
                update("bitrate", e.target.value as AudioBitrate)
              }
              className="rounded-[9px] border border-[#dfe5ef] bg-white px-3 py-2 text-xs text-[#40506a] outline-[#6578f7]"
            >
              <option value="64k">64 kbps (軽量・音声向き)</option>
              <option value="96k">96 kbps</option>
              <option value="128k">128 kbps (標準音質)</option>
              <option value="160k">160 kbps</option>
              <option value="192k">192 kbps (高音質)</option>
              <option value="256k">256 kbps</option>
              <option value="320k">320 kbps (最高音質)</option>
            </select>
            <span className="text-[10px] text-[#9aa6b7]">
              ビットレートが高いほど一般に音質とファイルサイズが増加します
            </span>
          </div>
        )}
      </div>
    </div>
  );
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

  const [pngCompressionLevel, setPngCompressionLevel] = useState<number>(9);
  const [jpegQV, setJpegQV] = useState<number>(3);
  const [webpQV, setWebpQV] = useState<number>(75);
  const [gifFPS, setGifFPS] = useState<number>(15);
  const [gifMaxColors, setGifMaxColors] = useState<number>(256);

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

  const selectFile = (file?: File) => {
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

    if (detectedFormat === "GIF") {
      setConvertedFormat("MP4");
    } else if (VIDEO_FORMATS.includes(detectedFormat as VideoFormat)) {
      setConvertedFormat("GIF");
    } else if (AUDIO_FORMATS.includes(detectedFormat as AudioFormat)) {
      setConvertedFormat("MP3");
    } else {
      setConvertedFormat("PNG");
    }
  };

  const buildConversionOptions = () => {
    if (!detailsOpen) {
      return undefined;
    }

    if (convertedFormat === "PNG") {
      return {
        compressionLevel: pngCompressionLevel,
      };
    }

    if (convertedFormat === "JPEG") {
      return {
        qVJpeg: jpegQV,
      };
    }

    if (convertedFormat === "WebP") {
      return {
        qVWebp: webpQV,
      };
    }

    if (convertedFormat === "GIF") {
      return {
        fps: gifFPS,
        maxColors: gifMaxColors,
      };
    }

    if (isAudioFormat(convertedFormat)) {
      // sampleRateやchannelsが 0 (Auto) の場合は undefined にし、Rust/FFmpeg側で引数を省略できるようにする
      const commonAudio = {
        sampleRate:
          audioCompression.sampleRate > 0
            ? audioCompression.sampleRate
            : undefined,
        channels:
          audioCompression.channels > 0 ? audioCompression.channels : undefined,
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
          変換博士
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
              <UploadIcon />
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

          {/* Arrow */}
          <div
            className="
              mt-7 flex w-38.5 items-center

              max-[980px]:my-11.25
              max-[980px]:mb-8.25
              max-[980px]:rotate-90
            "
          >
            <span className="sr-only">{convertedFormat} に変換</span>

            <span className="h-px flex-1 bg-linear-to-r from-[#cad2f9] to-[#7081ef]" />

            <i
              aria-hidden="true"
              className="
                -ml-1.5
                size-2.75
                rotate-45
                border-r
                border-t
                border-[#7081ef]
              "
            />
          </div>

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
              <FileIcon />
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
            {sourceFile &&
            IMAGE_FORMATS.includes(convertedFormat as ImageFormat) ? (
              <div className="flex flex-wrap items-center gap-6">
                {convertedFormat === "PNG" && (
                  <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label
                        htmlFor="png-compression"
                        className="font-semibold text-[#415166]"
                      >
                        圧縮レベル(可逆圧縮)
                      </label>
                      <span className="rounded bg-[#eef1ff] px-2 py-0.5 font-['Plus_Jakarta_Sans',sans-serif] text-xs font-bold text-[#586cec]">
                        {pngCompressionLevel}
                      </span>
                    </div>
                    <input
                      type="range"
                      id="png-compression"
                      min="0"
                      max="9"
                      value={pngCompressionLevel}
                      onChange={(e) =>
                        setPngCompressionLevel(
                          Number.parseInt(e.target.value, 10),
                        )
                      }
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#e3e8f1] accent-[#586cec]"
                    />
                    <div className="flex justify-between text-[10px] text-[#9aa6b7]">
                      <span>0 (低圧縮)</span>
                      <span>9 (高圧縮)</span>
                    </div>
                  </div>
                )}
                {convertedFormat === "JPEG" && (
                  <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label
                        htmlFor="jpeg-quality"
                        className="font-semibold text-[#415166]"
                      >
                        圧縮レベル(非可逆圧縮)
                      </label>
                      <span className="rounded bg-[#eef1ff] px-2 py-0.5 font-['Plus_Jakarta_Sans',sans-serif] text-xs font-bold text-[#586cec]">
                        {jpegQV}
                      </span>
                    </div>
                    <input
                      type="range"
                      id="jpeg-quality"
                      min="1"
                      max="31"
                      value={jpegQV}
                      onChange={(e) =>
                        setJpegQV(Number.parseInt(e.target.value, 10))
                      }
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#e3e8f1] accent-[#586cec]"
                    />
                    <div className="flex justify-between text-[10px] text-[#9aa6b7]">
                      <span>1 (高品質)</span>
                      <span>31 (低品質)</span>
                    </div>
                  </div>
                )}
                {convertedFormat === "WebP" && (
                  <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label
                        htmlFor="webp-quality"
                        className="font-semibold text-[#415166]"
                      >
                        品質(非可逆圧縮)
                      </label>
                      <span className="rounded bg-[#eef1ff] px-2 py-0.5 font-['Plus_Jakarta_Sans',sans-serif] text-xs font-bold text-[#586cec]">
                        {webpQV}
                      </span>
                    </div>
                    <input
                      type="range"
                      id="webp-quality"
                      min="1"
                      max="100"
                      value={webpQV}
                      onChange={(e) =>
                        setWebpQV(Number.parseInt(e.target.value, 10))
                      }
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#e3e8f1] accent-[#586cec]"
                    />
                    <div className="flex justify-between text-[10px] text-[#9aa6b7]">
                      <span>1 (低品質)</span>
                      <span>100 (高品質)</span>
                    </div>
                  </div>
                )}
                {convertedFormat === "GIF" && (
                  <>
                    {(sourceFormat === "GIF" ||
                      VIDEO_FORMATS.includes(sourceFormat as VideoFormat)) && (
                      <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <label
                            htmlFor="gif-fps"
                            className="font-semibold text-[#415166]"
                          >
                            FPS
                          </label>
                          <span className="rounded bg-[#eef1ff] px-2 py-0.5 font-['Plus_Jakarta_Sans',sans-serif] text-xs font-bold text-[#586cec]">
                            {gifFPS} fps
                          </span>
                        </div>
                        <input
                          type="range"
                          id="gif-fps"
                          min="1"
                          max="120"
                          value={gifFPS}
                          onChange={(e) =>
                            setGifFPS(Number.parseInt(e.target.value, 10))
                          }
                          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#e3e8f1] accent-[#586cec]"
                        />
                        <div className="flex justify-between text-[10px] text-[#9aa6b7]">
                          <span>1 fps</span>
                          <span>120 fps</span>
                        </div>
                      </div>
                    )}
                    <div className="flex min-w-55 flex-1 max-w-sm flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <label
                          htmlFor="gif-max-colors"
                          className="font-semibold text-[#415166]"
                        >
                          色数
                        </label>
                        <span className="rounded bg-[#eef1ff] px-2 py-0.5 font-['Plus_Jakarta_Sans',sans-serif] text-xs font-bold text-[#586cec]">
                          {gifMaxColors} 色
                        </span>
                      </div>
                      <input
                        type="range"
                        id="gif-max-colors"
                        min="2"
                        max="256"
                        value={gifMaxColors}
                        onChange={(e) =>
                          setGifMaxColors(Number.parseInt(e.target.value, 10))
                        }
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#e3e8f1] accent-[#586cec]"
                      />
                      <div className="flex justify-between text-[10px] text-[#9aa6b7]">
                        <span>2 色</span>
                        <span>256 色</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : sourceFile && isAudioFormat(convertedFormat) ? (
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
