import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import coreURL from "../../node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js?url";
import wasmURL from "../../node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm?url";
import {
  type Format,
  formatToExtension,
  type MediaDimensions,
} from "../formats.ts";
import { buildArgs } from "./ffmpeg.ts";

export type BrowserConversionOptions = Parameters<typeof buildArgs>[4];

let ffmpeg: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;
let conversionSequence = 0;

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

// Rust: probe_dimensions
export async function probeDimensions(
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

// Rust: generate_thumbnail
export async function generateThumbnail(source: string): Promise<Blob> {
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.src = source;

  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error("Video thumbnail load failed"));
  });

  video.currentTime = 0.001;
  await new Promise<void>((resolve, reject) => {
    video.onseeked = () => resolve();
    video.onerror = () => reject(new Error("Video thumbnail seek failed"));
  });

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d")?.drawImage(video, 0, 0);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Video thumbnail generation failed"));
        }
      },
      "image/jpeg",
      0.85,
    );
  });
}

export async function convertBrowserFile(
  file: File,
  inputFormat: Format,
  outputFormat: Format,
  options: BrowserConversionOptions,
): Promise<Blob> {
  const instance = await loadBrowserFfmpeg();
  const conversionId = ++conversionSequence;
  const inputName = `input-${conversionId}.${formatToExtension(inputFormat)}`;
  const outputName = `output-${conversionId}.${formatToExtension(outputFormat)}`;

  // Rust: input_path を用意して FFmpeg を実行する流れに対応。
  // ブラウザでは File の内容を WASM の仮想ファイルへ書き込みます。
  try {
    await instance.writeFile(
      inputName,
      new Uint8Array(await file.arrayBuffer()),
    );
    // Rust: ffmpeg::build_args
    const args = buildArgs(
      inputName,
      outputName,
      inputFormat,
      outputFormat,
      options,
    );
    await instance.exec(args);

    // Rust: 出力ファイルの存在確認後にパスを返す処理に対応。
    const output = await instance.readFile(outputName);
    if (output.length === 0) {
      throw new Error("Browser FFmpeg produced an empty output file");
    }
    return new Blob([output as BlobPart], {
      type: fileTypeForFormat(outputFormat),
    });
  } finally {
    // Rust: TempFile の Drop による失敗・キャンセル時の後始末に対応。
    await instance.deleteFile(inputName).catch(() => {});
    await instance.deleteFile(outputName).catch(() => {});
  }
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
