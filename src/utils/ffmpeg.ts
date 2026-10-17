import {
  type AudioFormat,
  type Format,
  isAudioFormat,
  VIDEO_FORMATS,
  type VideoFormat,
} from "../formats";

/**
 * Rust の conversion::types::ConversionOptions に対応する型。
 */
export type ConversionOptions = {
  width?: number;
  height?: number;
  antiAliasing?: boolean;
  compressionLevel?: number;
  qVJpeg?: number;
  qVWebp?: number;
  avifQuality?: number;
  avifSpeed?: number;
  fps?: number;
  maxColors?: number;
  crf?: number;
  crfVp9?: number;
  qVAvi?: number;
  bmpBitDepth?: number;
  bmpCompression?: boolean;
  icoSizes?: number[];
  icoFitMode?: "pad" | "square";
  audio?: {
    bitrate?: string;
    flacCompressionLevel?: number;
    vorbisQuality?: number;
    sampleRate?: number;
    channels?: number;
    pcmBitDepth?: 16 | 24 | 32;
  };
};

/**
 * Rust: ffmpeg::build_args
 *
 * Rust側の build_args と同じ順番で変換種別を判定します。
 */
export function buildArgs(
  inputPath: string,
  outputPath: string,
  inputFormat: Format,
  outputFormat: Format,
  options: ConversionOptions = {},
): string[] {
  const isInputVideo = VIDEO_FORMATS.includes(inputFormat as VideoFormat);

  // Rust: (input_format.is_video() || input_format == FileFormat::Gif)
  //       && output_format == FileFormat::Gif
  if ((isInputVideo || inputFormat === "GIF") && outputFormat === "GIF") {
    return buildVideoOrGifToGifArgs(inputPath, outputPath, options);
  }

  // Rust: input_format == FileFormat::Gif && output_format.is_video()
  if (
    inputFormat === "GIF" &&
    VIDEO_FORMATS.includes(outputFormat as VideoFormat)
  ) {
    return buildGifToVideoArgs(
      inputPath,
      outputPath,
      outputFormat as VideoFormat,
      options,
    );
  }

  // Rust: input_format.is_video() && output_format.is_audio()
  if (isInputVideo && isAudioFormat(outputFormat)) {
    return buildVideoToAudioArgs(inputPath, outputPath, options);
  }

  // Rust: output_format.is_audio()
  if (isAudioFormat(outputFormat)) {
    return buildAudioArgs(inputPath, outputPath, outputFormat, options);
  }

  // Rust: output_format == FileFormat::Ico
  if (
    outputFormat === "ICO" &&
    options.icoSizes != null &&
    options.icoSizes.length > 0
  ) {
    return buildIcoMultiSizeArgs(
      inputPath,
      outputPath,
      options.icoSizes,
      options,
    );
  }

  // Rust: build_default_args
  return buildDefaultArgs(inputPath, outputPath, outputFormat, options);
}

function buildIcoMultiSizeArgs(
  inputPath: string,
  outputPath: string,
  sizes: number[],
  options: ConversionOptions,
): string[] {
  const args = ["-y", "-i", inputPath];
  const fitMode = options.icoFitMode ?? "pad";
  const flags = (options.antiAliasing ?? true) ? "lanczos" : "neighbor";
  const count = sizes.length;
  const splitOutputs = sizes.map((_, index) => `[in${index}]`).join("");
  const filterParts = [`split=${count}${splitOutputs}`];

  for (const [index, size] of sizes.entries()) {
    const filter =
      fitMode === "pad"
        ? `[in${index}]scale=w='min(${size}\\,iw)':h='min(${size}\\,ih)':force_original_aspect_ratio=decrease:flags=${flags},pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2:color=0x00000000,setsar=1[out${index}]`
        : `[in${index}]scale=${size}:${size}:flags=${flags},setsar=1[out${index}]`;
    filterParts.push(filter);
  }

  args.push("-filter_complex", filterParts.join(";"));
  for (let index = 0; index < count; index += 1) {
    args.push("-map", `[out${index}]`);
  }
  args.push(outputPath);
  return args;
}

function buildDefaultArgs(
  inputPath: string,
  outputPath: string,
  outputFormat: Format,
  options: ConversionOptions,
): string[] {
  const args = ["-y", "-i", inputPath];

  let scaleFilter = buildScaleFilter(
    options.width,
    options.height,
    VIDEO_FORMATS.includes(outputFormat as VideoFormat),
    options.antiAliasing ?? true,
  );

  // Rust側と同じく、ICOのリサイズ指定がない場合は256px以内に収めます。
  if (outputFormat === "ICO" && scaleFilter == null) {
    const flags = (options.antiAliasing ?? true) ? "lanczos" : "neighbor";
    scaleFilter = `scale=min(256\\,iw):min(256\\,ih):force_original_aspect_ratio=decrease:flags=${flags},setsar=1`;
  }

  if (scaleFilter != null) {
    args.push("-vf", scaleFilter);
  }

  if (["PNG", "JPEG", "WebP", "AVIF", "BMP", "ICO"].includes(outputFormat)) {
    args.push("-frames:v", "1");
  }
  if (options.compressionLevel != null) {
    args.push("-compression_level", String(options.compressionLevel));
  }
  if (options.qVJpeg != null) {
    args.push("-q:v", String(options.qVJpeg));
  }
  if (options.qVWebp != null) {
    args.push("-q:v", String(options.qVWebp));
  }

  if (outputFormat === "AVIF") {
    args.push("-c:v", "libaom-av1");
    if (options.avifQuality != null) {
      args.push("-crf", String(options.avifQuality), "-b:v", "0");
    }
    if (options.avifSpeed != null) {
      args.push("-cpu-used", String(options.avifSpeed));
    }
  }

  if (outputFormat === "BMP") {
    if (options.bmpBitDepth != null) {
      args.push("-pix_fmt", bmpPixelFormat(options.bmpBitDepth));
    }
    if (options.bmpCompression) {
      args.push("-compression_algo", "rle");
    }
  }

  if (VIDEO_FORMATS.includes(outputFormat as VideoFormat)) {
    appendVideoOutputOptions(args, outputFormat as VideoFormat);

    switch (outputFormat) {
      case "MP4":
      case "MOV":
        if (options.crf != null) args.push("-crf", String(options.crf));
        break;
      case "WebM":
        if (options.crfVp9 != null) {
          args.push("-crf", String(options.crfVp9), "-b:v", "0");
        }
        break;
      case "AVI":
        if (options.qVAvi != null) args.push("-q:v", String(options.qVAvi));
        break;
    }
  }

  args.push(outputPath);
  return args;
}

// ============================================================
// Audio
// ============================================================

function buildAudioArgs(
  inputPath: string,
  outputPath: string,
  outputFormat: AudioFormat,
  options: ConversionOptions,
): string[] {
  const args = ["-y", "-i", inputPath];
  const audioOptions = options.audio;

  switch (outputFormat) {
    case "MP3":
      args.push("-c:a", "libmp3lame");
      if (audioOptions?.bitrate) args.push("-b:a", audioOptions.bitrate);
      break;
    case "M4A":
    case "AAC":
      args.push("-c:a", "aac");
      if (audioOptions?.bitrate) args.push("-b:a", audioOptions.bitrate);
      break;
    case "FLAC":
      args.push("-c:a", "flac");
      if (audioOptions?.flacCompressionLevel != null) {
        args.push(
          "-compression_level",
          String(audioOptions.flacCompressionLevel),
        );
      }
      break;
    case "OGG":
      args.push("-c:a", "libvorbis");
      if (audioOptions?.vorbisQuality != null) {
        args.push("-q:a", String(audioOptions.vorbisQuality));
      }
      break;
    case "OPUS":
      args.push("-c:a", "libopus");
      if (audioOptions?.bitrate) args.push("-b:a", audioOptions.bitrate);
      break;
    case "WMA":
      args.push("-c:a", "wmav2");
      if (audioOptions?.bitrate) args.push("-b:a", audioOptions.bitrate);
      break;
    case "WAV":
      args.push("-c:a", pcmCodec(audioOptions?.pcmBitDepth, "le"));
      break;
    case "AIFF":
      args.push("-c:a", pcmCodec(audioOptions?.pcmBitDepth, "be"));
      break;
  }

  appendAudioCommonOptions(args, audioOptions);
  args.push(outputPath);
  return args;
}

function appendAudioCommonOptions(
  args: string[],
  options: ConversionOptions["audio"],
): void {
  if (options?.sampleRate && options.sampleRate > 0) {
    args.push("-ar", String(options.sampleRate));
  }
  if (options?.channels && options.channels > 0) {
    args.push("-ac", String(options.channels));
  }
}

// ============================================================
// GIF
// ============================================================

function buildVideoOrGifToGifArgs(
  inputPath: string,
  outputPath: string,
  options: ConversionOptions,
): string[] {
  const fps = options.fps ?? 15;
  const scale =
    buildScaleFilter(
      options.width,
      options.height,
      false,
      options.antiAliasing ?? true,
    ) ?? "scale=iw:ih:flags=lanczos";
  const filter = `fps=${fps},${scale},split[s0][s1];[s0]palettegen=max_colors=${options.maxColors ?? 256}:reserve_transparent=0[p];[s1][p]paletteuse`;

  return ["-y", "-i", inputPath, "-filter_complex", filter, outputPath];
}

// ============================================================
// GIF → Video
// ============================================================

function buildGifToVideoArgs(
  inputPath: string,
  outputPath: string,
  outputFormat: VideoFormat,
  options: ConversionOptions,
): string[] {
  const args = ["-y", "-i", inputPath];
  const scaleFilter = buildScaleFilter(
    options.width,
    options.height,
    true,
    options.antiAliasing ?? true,
  );

  if (scaleFilter != null) {
    args.push("-vf", scaleFilter);
  } else {
    args.push(
      "-vf",
      "scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos,setsar=1",
    );
  }
  if (options.fps != null) {
    args.push("-r", String(options.fps));
  }

  appendVideoOutputOptions(args, outputFormat);
  args.push(outputPath);
  return args;
}

function buildVideoToAudioArgs(
  inputPath: string,
  outputPath: string,
  _options: ConversionOptions,
): string[] {
  return ["-y", "-i", inputPath, "-vn", outputPath];
}

function appendVideoOutputOptions(
  args: string[],
  outputFormat: VideoFormat,
): void {
  switch (outputFormat) {
    case "MP4":
      args.push(
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
      );
      break;
    case "MOV":
      args.push("-c:v", "libx264", "-pix_fmt", "yuv420p");
      break;
    case "WebM":
      args.push("-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p");
      break;
    case "AVI":
      args.push("-c:v", "mpeg4");
      break;
  }
}

// ============================================================
// Utility
// ============================================================

function buildScaleFilter(
  width: number | undefined,
  height: number | undefined,
  requireEven: boolean,
  antiAliasing: boolean,
): string | undefined {
  const flags = antiAliasing ? "lanczos" : "neighbor";
  let scale: string | undefined;

  if (width != null && height != null) {
    scale = `scale=${normalizeDimension(width, requireEven)}:${normalizeDimension(height, requireEven)}:flags=${flags}`;
  } else if (width != null) {
    scale = `scale=${normalizeDimension(width, requireEven)}:${requireEven ? -2 : -1}:flags=${flags}`;
  } else if (height != null) {
    scale = `scale=${requireEven ? -2 : -1}:${normalizeDimension(height, requireEven)}:flags=${flags}`;
  }

  return scale == null ? undefined : `${scale},setsar=1`;
}

function normalizeDimension(value: number, requireEven: boolean): number {
  if (!requireEven || value % 2 === 0) {
    return value;
  }
  return Math.min(value + 1, 16384);
}

function bmpPixelFormat(bitDepth: number): string {
  switch (bitDepth) {
    case 1:
      return "monow";
    case 8:
      return "pal8";
    case 16:
      return "rgb555le";
    case 32:
      return "bgra";
    default:
      return "bgr24";
  }
}

function pcmCodec(
  bitDepth: 16 | 24 | 32 | undefined,
  endianness: "le" | "be",
): string {
  return `pcm_s${bitDepth ?? 16}${endianness}`;
}
