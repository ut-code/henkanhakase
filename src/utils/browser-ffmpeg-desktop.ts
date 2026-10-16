import type { Format, MediaDimensions } from "../formats.ts";

export type BrowserConversionOptions = {
  width?: number;
  height?: number;
  antiAliasing?: boolean;
  compressionLevel?: number;
  qVJpeg?: number;
  qVWebp?: number;
  fps?: number;
  maxColors?: number;
  crf?: number;
  crfVp9?: number;
  qVAvi?: number;
  audio?: {
    bitrate?: string;
    flacCompressionLevel?: number;
    vorbisQuality?: number;
    sampleRate?: number;
    channels?: number;
    pcmBitDepth?: 16 | 24 | 32;
  };
};

export async function loadBrowserFfmpeg(): Promise<never> {
  throw new Error("Browser FFmpeg is unavailable in the desktop build");
}

export async function convertBrowserFile(
  _file: File,
  _inputFormat: Format,
  _outputFormat: Format,
  _options?: BrowserConversionOptions,
): Promise<never> {
  throw new Error("Browser FFmpeg is unavailable in the desktop build");
}

export function cancelBrowserFfmpeg(): void {}

export async function probeBrowserFile(
  _file: File,
  _format: Format,
): Promise<MediaDimensions> {
  throw new Error("Browser file probing is unavailable in the desktop build");
}
