export const IMAGE_FORMATS = ["PNG", "JPEG", "WebP", "GIF"] as const;
export const VIDEO_FORMATS = ["MP4", "WebM", "AVI", "MOV"] as const;
export const AUDIO_FORMATS = [
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
export const SUPPORTED_FORMATS = [
  ...IMAGE_FORMATS,
  ...VIDEO_FORMATS,
  ...AUDIO_FORMATS,
];
export type ImageFormat = (typeof IMAGE_FORMATS)[number];
export type VideoFormat = (typeof VIDEO_FORMATS)[number];
export type AudioFormat = (typeof AUDIO_FORMATS)[number];
export type Format = ImageFormat | VideoFormat | AudioFormat;

export type MediaDimensions = {
  width: number;
  height: number;
};

export type AudioBitrate =
  | "64k"
  | "96k"
  | "128k"
  | "160k"
  | "192k"
  | "256k"
  | "320k";

export type AudioCompressionOptions = {
  bitrate: AudioBitrate;
  flacCompressionLevel: number;
  vorbisQuality: number;
  sampleRate: number; // 0 = 元ファイルのまま(Auto)
  channels: number; // 0 = 元ファイルのまま(Auto), 1 = モノラル, 2 = ステレオ
  pcmBitDepth: 16 | 24 | 32;
};

export const mimeTypes: Record<Format, string[]> = {
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

export function formatToExtension(format: Format): string {
  switch (format) {
    case "JPEG":
      return "jpg";

    default:
      return format.toLowerCase();
  }
}

export function isAudioFormat(format: Format | null): format is AudioFormat {
  return format !== null && AUDIO_FORMATS.includes(format as AudioFormat);
}

export function isLossyAudioFormat(format: Format | null): boolean {
  return (
    format === "MP3" ||
    format === "M4A" ||
    format === "AAC" ||
    format === "WMA" ||
    format === "OGG" ||
    format === "OPUS"
  );
}
