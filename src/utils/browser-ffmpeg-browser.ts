import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import coreURL from "../../node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js?url";
import wasmURL from "../../node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm?url";
import type { Format, MediaDimensions } from "../formats.ts";
import { buildFfmpegArgs } from "./ffmpeg.ts";

export type BrowserConversionOptions = Parameters<typeof buildFfmpegArgs>[4];

let ffmpeg: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

export async function loadBrowserFfmpeg(): Promise<FFmpeg> {
  if (ffmpeg?.loaded) return ffmpeg;
  if (loading) return loading;

  loading = (async () => {
    const instance = new FFmpeg();
    await instance.load({
      coreURL: await toBlobURL(coreURL, "text/javascript"),
      wasmURL: await toBlobURL(wasmURL, "application/wasm"),
    });
    ffmpeg = instance;
    return instance;
  })();

  try {
    return await loading;
  } finally {
    loading = null;
  }
}

export async function probeBrowserFile(
  file: File,
  format: Format,
): Promise<MediaDimensions> {
  if (
    format === "GIF" ||
    format === "PNG" ||
    format === "JPEG" ||
    format === "WebP" ||
    format === "BMP" ||
    format === "ICO" ||
    format === "AVIF" ||
    format === "HEIC"
  ) {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      return { width: image.naturalWidth, height: image.naturalHeight };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Video metadata load failed"));
    });
    return { width: video.videoWidth, height: video.videoHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function convertBrowserFile(
  file: File,
  inputFormat: Format,
  outputFormat: Format,
  options: BrowserConversionOptions,
): Promise<Blob> {
  const instance = await loadBrowserFfmpeg();
  const inputName = `input.${inputFormat.toLowerCase()}`;
  const outputName = `output.${outputFormat.toLowerCase()}`;

  await instance.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));
  await instance.exec(
    buildFfmpegArgs(inputName, outputName, inputFormat, outputFormat, options),
  );
  const output = await instance.readFile(outputName);
  await instance.deleteFile(inputName).catch(() => {});
  await instance.deleteFile(outputName).catch(() => {});

  return new Blob([output as BlobPart], {
    type: fileTypeForFormat(outputFormat),
  });
}

export function cancelBrowserFfmpeg(): void {
  ffmpeg?.terminate();
  ffmpeg = null;
  loading = null;
}

function fileTypeForFormat(format: Format): string {
  switch (format) {
    case "PNG":
      return "image/png";
    case "JPEG":
      return "image/jpeg";
    case "WebP":
      return "image/webp";
    case "GIF":
      return "image/gif";
    case "AVIF":
      return "image/avif";
    case "BMP":
      return "image/bmp";
    case "ICO":
      return "image/x-icon";
    case "MP4":
      return "video/mp4";
    case "MOV":
      return "video/quicktime";
    case "WebM":
      return "video/webm";
    case "AVI":
      return "video/x-msvideo";
    case "MP3":
      return "audio/mpeg";
    case "M4A":
      return "audio/mp4";
    case "AAC":
      return "audio/aac";
    case "FLAC":
      return "audio/flac";
    case "OGG":
      return "audio/ogg";
    case "OPUS":
      return "audio/opus";
    case "WAV":
      return "audio/wav";
    case "AIFF":
      return "audio/aiff";
    case "WMA":
      return "audio/x-ms-wma";
    case "HEIC":
      return "image/heic";
  }
}
