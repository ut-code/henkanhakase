import type { Format, MediaDimensions } from "../formats.ts";
import type { ConversionOptions } from "./ffmpeg.ts";

export type BrowserConversionOptions = ConversionOptions;

export async function loadBrowserFfmpeg(): Promise<never> {
  throw new Error("Browser FFmpeg is unavailable in the desktop build");
}

export async function convertBrowserFile(
  _file: File,
  _inputFormat: Format,
  _outputFormat: Format,
  _options?: BrowserConversionOptions,
): Promise<Blob> {
  throw new Error("Browser FFmpeg is unavailable in the desktop build");
}

export function cancelBrowserFfmpeg(): void {}

export async function probeDimensions(
  _file: File,
  _format: Format,
): Promise<MediaDimensions> {
  throw new Error("Browser file probing is unavailable in the desktop build");
}

export async function generateThumbnail(_source: string): Promise<Blob> {
  throw new Error(
    "Browser thumbnail generation is unavailable in the desktop build",
  );
}
