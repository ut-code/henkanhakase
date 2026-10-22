import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { heicTo } from "heic-to";
import coreURL from "../../node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js?url";
import wasmURL from "../../node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm?url";
import {
  type Format,
  formatToExtension,
  IMAGE_FORMATS,
  type ImageFormat,
  type MediaDimensions,
} from "../formats.ts";
import { buildArgs } from "./ffmpeg.ts";

export type BrowserConversionOptions = NonNullable<
  Parameters<typeof buildArgs>[4]
>;

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
  if (format === "HEIC") {
    const pngBlob = await convertHeicToPng(file);
    return probeImageBlobDimensions(pngBlob);
  }

  if (
    format === "GIF" ||
    format === "PNG" ||
    format === "JPEG" ||
    format === "WebP" ||
    format === "BMP" ||
    format === "ICO" ||
    format === "AVIF"
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

async function probeImageBlobDimensions(blob: Blob): Promise<MediaDimensions> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
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
  options: BrowserConversionOptions = {},
): Promise<Blob> {
  if (inputFormat === "SVG") {
    const pngBlob = await convertImageToPng(file, options);
    if (outputFormat === "PNG") {
      return pngBlob;
    }

    const pngFile = new File([pngBlob], "rasterized.png", {
      type: "image/png",
    });
    return convertBrowserFile(pngFile, "PNG", outputFormat, {
      ...options,
      width: undefined,
      height: undefined,
    });
  }

  if (
    outputFormat === "AVIF" &&
    IMAGE_FORMATS.includes(inputFormat as ImageFormat)
  ) {
    if (inputFormat === "HEIC") {
      const pngBlob = await convertHeicToPng(file);
      return convertImageToAvif(pngBlob, options);
    }
    return convertImageToAvif(file, options);
  }

  if (inputFormat === "HEIC") {
    const pngBlob = await convertHeicToPng(file);
    if (outputFormat === "PNG") {
      return pngBlob;
    }

    const pngFile = new File([pngBlob], "decoded.png", {
      type: "image/png",
    });
    return convertBrowserFile(pngFile, "PNG", outputFormat, options);
  }

  if (inputFormat === "AVIF") {
    const pngBlob = await convertImageToPng(file, options);
    if (outputFormat === "PNG") {
      return pngBlob;
    }

    const pngFile = new File([pngBlob], "decoded.png", {
      type: "image/png",
    });
    return convertBrowserFile(pngFile, "PNG", outputFormat, {
      ...options,
      width: undefined,
      height: undefined,
    });
  }

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

async function convertImageToAvif(
  file: Blob,
  options: BrowserConversionOptions = {},
): Promise<Blob> {
  return convertImageToCanvasFormat(file, "image/avif", options);
}

async function convertImageToPng(
  file: Blob,
  options: BrowserConversionOptions = {},
): Promise<Blob> {
  return convertImageToCanvasFormat(file, "image/png", options);
}

async function convertHeicToPng(file: File): Promise<Blob> {
  return heicTo({
    blob: file,
    type: "image/png",
  });
}

async function convertImageToCanvasFormat(
  file: Blob,
  mimeType: "image/avif" | "image/png",
  options: BrowserConversionOptions,
): Promise<Blob> {
  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();

    const width = options.width ?? image.naturalWidth;
    const height = options.height ?? image.naturalHeight;
    const targetWidth =
      options.width == null && options.height != null
        ? Math.round((image.naturalWidth * height) / image.naturalHeight)
        : width;
    const targetHeight =
      options.height == null && options.width != null
        ? Math.round((image.naturalHeight * width) / image.naturalWidth)
        : height;
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas context is unavailable");
    }
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const quality =
      mimeType === "image/avif" && options.avifQuality != null
        ? Math.max(0, Math.min(1, 1 - options.avifQuality / 63))
        : undefined;

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(
              new Error(
                mimeType === "image/avif"
                  ? "This browser does not support AVIF encoding"
                  : "Failed to decode image as PNG",
              ),
            );
          }
        },
        mimeType,
        quality,
      );
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
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
    default:
      throw new Error(`Unsupported output format: ${format}`);
  }
}
