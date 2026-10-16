import {
  type Format,
  isAudioFormat,
  VIDEO_FORMATS,
  type VideoFormat,
} from "../formats";

export type ConversionOptions = {
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

function buildScaleFilter(
  width?: number,
  height?: number,
  requireEven = false,
  antiAliasing = true,
): string | undefined {
  const flags = antiAliasing ? "lanczos" : "neighbor";
  const normalize = (val: number) =>
    requireEven && val % 2 !== 0 ? Math.min(val + 1, 16384) : val;

  let scale: string;
  if (width != null && height != null) {
    scale = `scale=${normalize(width)}:${normalize(height)}:flags=${flags}`;
  } else if (width != null) {
    scale = `scale=${normalize(width)}:${requireEven ? -2 : -1}:flags=${flags}`;
  } else if (height != null) {
    scale = `scale=${requireEven ? -2 : -1}:${normalize(height)}:flags=${flags}`;
  } else {
    return undefined;
  }
  return `${scale},setsar=1`;
}

function appendVideoOutputOptions(args: string[], format: Format): void {
  switch (format) {
    case "MP4":
    case "MOV":
      args.push("-c:v", "libx264", "-pix_fmt", "yuv420p");
      if (format === "MP4") {
        args.push("-movflags", "+faststart");
      }
      break;
    case "WebM":
      args.push("-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p");
      break;
    case "AVI":
      args.push("-c:v", "mpeg4");
      break;
  }
}

function buildAudioArgs(
  inputName: string,
  outputName: string,
  outputFormat: Format,
  options?: ConversionOptions,
): string[] {
  const args = ["-y", "-i", inputName];
  const audio = options?.audio;

  switch (outputFormat) {
    case "MP3":
      args.push("-c:a", "libmp3lame");
      if (audio?.bitrate) args.push("-b:a", audio.bitrate);
      break;
    case "M4A":
    case "AAC":
      args.push("-c:a", "aac");
      if (audio?.bitrate) args.push("-b:a", audio.bitrate);
      break;
    case "FLAC":
      args.push("-c:a", "flac");
      if (audio?.flacCompressionLevel != null) {
        args.push("-compression_level", String(audio.flacCompressionLevel));
      }
      break;
    case "OGG":
      args.push("-c:a", "libvorbis");
      if (audio?.vorbisQuality != null) {
        args.push("-q:a", String(audio.vorbisQuality));
      }
      break;
    case "OPUS":
      args.push("-c:a", "libopus");
      if (audio?.bitrate) args.push("-b:a", audio.bitrate);
      break;
    case "WMA":
      args.push("-c:a", "wmav2");
      if (audio?.bitrate) args.push("-b:a", audio.bitrate);
      break;
    case "WAV": {
      const bitDepth = audio?.pcmBitDepth ?? 16;
      const codec =
        bitDepth === 24
          ? "pcm_s24le"
          : bitDepth === 32
            ? "pcm_s32le"
            : "pcm_s16le";
      args.push("-c:a", codec);
      break;
    }
    case "AIFF": {
      const bitDepth = audio?.pcmBitDepth ?? 16;
      const codec =
        bitDepth === 24
          ? "pcm_s24be"
          : bitDepth === 32
            ? "pcm_s32be"
            : "pcm_s16be";
      args.push("-c:a", codec);
      break;
    }
  }

  if (audio?.sampleRate && audio.sampleRate > 0) {
    args.push("-ar", String(audio.sampleRate));
  }
  if (audio?.channels && audio.channels > 0) {
    args.push("-ac", String(audio.channels));
  }

  args.push(outputName);
  return args;
}

export function buildFfmpegArgs(
  inputName: string,
  outputName: string,
  inputFormat: Format,
  outputFormat: Format,
  options?: ConversionOptions,
): string[] {
  const isInputVideo = VIDEO_FORMATS.includes(inputFormat as VideoFormat);
  const isOutputVideo = VIDEO_FORMATS.includes(outputFormat as VideoFormat);
  const isOutputAudio = isAudioFormat(outputFormat);

  // 動画/GIF → GIF
  if ((isInputVideo || inputFormat === "GIF") && outputFormat === "GIF") {
    const fps = options?.fps ?? 15;
    const scale =
      buildScaleFilter(
        options?.width,
        options?.height,
        false,
        options?.antiAliasing ?? true,
      ) ?? "scale=iw:ih:flags=lanczos";
    const filter = `fps=${fps},${scale},split[s0][s1];[s0]palettegen=max_colors=${options?.maxColors ?? 256}:reserve_transparent=0[p];[s1][p]paletteuse`;
    return ["-y", "-i", inputName, "-filter_complex", filter, outputName];
  }

  // GIF → 動画
  if (inputFormat === "GIF" && isOutputVideo) {
    const args = ["-y", "-i", inputName];
    const scale = buildScaleFilter(
      options?.width,
      options?.height,
      true,
      options?.antiAliasing ?? true,
    );
    if (scale) {
      args.push("-vf", scale);
    } else {
      args.push(
        "-vf",
        "scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos,setsar=1",
      );
    }
    if (options?.fps) {
      args.push("-r", String(options.fps));
    }
    appendVideoOutputOptions(args, outputFormat);
    if (outputFormat === "MP4" || outputFormat === "MOV") {
      if (options?.crf != null) args.push("-crf", String(options.crf));
    } else if (outputFormat === "WebM") {
      if (options?.crfVp9 != null) {
        args.push("-crf", String(options.crfVp9), "-b:v", "0");
      }
    } else if (outputFormat === "AVI") {
      if (options?.qVAvi != null) args.push("-q:v", String(options.qVAvi));
    }
    args.push(outputName);
    return args;
  }

  // 動画 → 音声
  if (isInputVideo && isOutputAudio) {
    const args = buildAudioArgs(inputName, outputName, outputFormat, options);
    args.splice(3, 0, "-vn");
    return args;
  }

  // 音声変換
  if (isOutputAudio) {
    return buildAudioArgs(inputName, outputName, outputFormat, options);
  }

  // デフォルト（画像変換、動画変換など）
  const args = ["-y", "-i", inputName];
  const scale = buildScaleFilter(
    options?.width,
    options?.height,
    isOutputVideo,
    options?.antiAliasing ?? true,
  );
  if (scale) {
    args.push("-vf", scale);
  }

  if (outputFormat === "PNG" || outputFormat === "JPEG") {
    args.push("-frames:v", "1");
  }

  if (options?.compressionLevel != null) {
    args.push("-compression_level", String(options.compressionLevel));
  }
  if (options?.qVJpeg != null) {
    args.push("-q:v", String(options.qVJpeg));
  }
  if (options?.qVWebp != null) {
    args.push("-q:v", String(options.qVWebp));
  }

  if (isOutputVideo) {
    appendVideoOutputOptions(args, outputFormat);
    if (outputFormat === "MP4" || outputFormat === "MOV") {
      if (options?.crf != null) args.push("-crf", String(options.crf));
    } else if (outputFormat === "WebM") {
      if (options?.crfVp9 != null) {
        args.push("-crf", String(options.crfVp9), "-b:v", "0");
      }
    } else if (outputFormat === "AVI") {
      if (options?.qVAvi != null) args.push("-q:v", String(options.qVAvi));
    }
  }

  args.push(outputName);
  return args;
}
