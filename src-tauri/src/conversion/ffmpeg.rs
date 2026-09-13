use std::path::Path;

use super::types::{ConversionOptions, FileFormat};

pub fn build_args(
    input_path: &Path,
    output_path: &Path,
    input_format: FileFormat,
    output_format: FileFormat,
    options: &ConversionOptions,
) -> Result<Vec<String>, String> {
    options.validate(output_format)?;
    if (input_format.is_video() || input_format == FileFormat::Gif)
        && output_format == FileFormat::Gif
    {
        return Ok(build_video_or_gif_to_gif_args(
            input_path,
            output_path,
            options,
        ));
    }

    // GIF → 動画
    if input_format == FileFormat::Gif && output_format.is_video() {
        return Ok(build_gif_to_video_args(
            input_path,
            output_path,
            output_format,
            options,
        ));
    }

    if input_format.is_video() && output_format.is_audio() {
        return Ok(build_video_to_audio_args(input_path, output_path));
    }

    // 音声変換
    if output_format.is_audio() {
        return build_audio_args(input_path, output_path, output_format, options);
    }

    // 既存の変換はこれまでと同様 FFmpeg に任せる
    Ok(build_default_args(
        input_path,
        output_path,
        output_format,
        options,
    ))
}

fn build_default_args(
    input_path: &Path,
    output_path: &Path,
    output_format: FileFormat,
    options: &ConversionOptions,
) -> Vec<String> {
    let mut args = vec!["-y".into(), "-i".into(), path_to_string(input_path)];

    if let Some(scale) = build_scale_filter(
        options.width,
        options.height,
        output_format.is_video(),
        options.anti_aliasing.unwrap_or(true),
    ) {
        args.extend(["-vf".into(), scale]);
    }

    if let Some(compression_level) = options.compression_level {
        args.extend(["-compression_level".into(), compression_level.to_string()]);
    }

    if let Some(q_v_jpeg) = options.q_v_jpeg {
        args.extend(["-q:v".into(), q_v_jpeg.to_string()]);
    }

    if let Some(q_v_webp) = options.q_v_webp {
        args.extend(["-q:v".into(), q_v_webp.to_string()]);
    }

    if output_format.is_video() {
        append_video_output_options(&mut args, output_format);

        match output_format {
            FileFormat::Mp4 | FileFormat::Mov => {
                if let Some(crf) = options.crf {
                    args.extend(["-crf".into(), crf.to_string()]);
                }
            }

            FileFormat::Webm => {
                if let Some(crf_vp9) = options.crf_vp9 {
                    args.extend([
                        "-crf".into(),
                        crf_vp9.to_string(),
                        "-b:v".into(),
                        "0".into(),
                    ]);
                }
            }

            FileFormat::Avi => {
                if let Some(q_v_avi) = options.q_v_avi {
                    args.extend(["-q:v".into(), q_v_avi.to_string()]);
                }
            }

            _ => {}
        }
    }

    args.push(path_to_string(output_path));

    args
}

// ============================================================
// Audio
// ============================================================

fn build_audio_args(
    input_path: &Path,
    output_path: &Path,
    output_format: FileFormat,
    options: &ConversionOptions,
) -> Result<Vec<String>, String> {
    let mut args = vec!["-y".into(), "-i".into(), path_to_string(input_path)];

    let audio_options = options.audio.as_ref();

    match output_format {
        FileFormat::Mp3 => {
            args.extend(["-c:a".into(), "libmp3lame".into()]);

            if let Some(audio) = audio_options {
                args.extend(["-b:a".into(), audio.bitrate.as_str().into()]);

                append_audio_common_options(&mut args, audio);
            }
        }

        FileFormat::M4a => {
            args.extend(["-c:a".into(), "aac".into()]);

            if let Some(audio) = audio_options {
                args.extend(["-b:a".into(), audio.bitrate.as_str().into()]);

                append_audio_common_options(&mut args, audio);
            }
        }

        FileFormat::Aac => {
            args.extend(["-c:a".into(), "aac".into()]);

            if let Some(audio) = audio_options {
                args.extend(["-b:a".into(), audio.bitrate.as_str().into()]);

                append_audio_common_options(&mut args, audio);
            }
        }

        FileFormat::Flac => {
            args.extend(["-c:a".into(), "flac".into()]);

            if let Some(audio) = audio_options {
                if let Some(level) = audio.flac_compression_level {
                    args.extend(["-compression_level".into(), level.to_string()]);
                }

                append_audio_common_options(&mut args, audio);
            }
        }

        FileFormat::Ogg => {
            args.extend(["-c:a".into(), "libvorbis".into()]);

            if let Some(audio) = audio_options {
                if let Some(quality) = audio.vorbis_quality {
                    args.extend(["-q:a".into(), quality.to_string()]);
                }

                append_audio_common_options(&mut args, audio);
            }
        }

        FileFormat::Opus => {
            args.extend(["-c:a".into(), "libopus".into()]);

            if let Some(audio) = audio_options {
                args.extend(["-b:a".into(), audio.bitrate.as_str().into()]);

                append_audio_common_options(&mut args, audio);
            }
        }

        FileFormat::Wma => {
            args.extend(["-c:a".into(), "wmav2".into()]);

            if let Some(audio) = audio_options {
                args.extend(["-b:a".into(), audio.bitrate.as_str().into()]);

                append_audio_common_options(&mut args, audio);
            }
        }

        FileFormat::Wav => {
            let bit_depth = audio_options
                .and_then(|audio| audio.pcm_bit_depth)
                .unwrap_or(16);

            let codec = match bit_depth {
                16 => "pcm_s16le",
                24 => "pcm_s24le",
                32 => "pcm_s32le",
                _ => {
                    return Err("WAV のPCMビット深度が不正です".into());
                }
            };

            args.extend(["-c:a".into(), codec.into()]);

            if let Some(audio) = audio_options {
                append_audio_common_options(&mut args, audio);
            }
        }

        FileFormat::Aiff => {
            let bit_depth = audio_options
                .and_then(|audio| audio.pcm_bit_depth)
                .unwrap_or(16);

            let codec = match bit_depth {
                16 => "pcm_s16be",
                24 => "pcm_s24be",
                32 => "pcm_s32be",
                _ => {
                    return Err("AIFF のPCMビット深度が不正です".into());
                }
            };

            args.extend(["-c:a".into(), codec.into()]);

            if let Some(audio) = audio_options {
                append_audio_common_options(&mut args, audio);
            }
        }

        _ => {
            return Err(format!(
                "音声出力形式としてサポートされていません: {:?}",
                output_format
            ));
        }
    }

    args.push(path_to_string(output_path));

    Ok(args)
}

/// MP3 / AAC / FLAC / Vorbis / Opus / PCM などに共通する
/// サンプルレート・チャンネル設定
fn append_audio_common_options(args: &mut Vec<String>, options: &super::types::AudioOptions) {
    if let Some(sample_rate) = options.sample_rate {
        if sample_rate > 0 {
            args.extend(["-ar".into(), sample_rate.to_string()]);
        }
    }

    if let Some(channels) = options.channels {
        if channels > 0 {
            args.extend(["-ac".into(), channels.to_string()]);
        }
    }
}

// ============================================================
// GIF
// ============================================================

fn build_video_or_gif_to_gif_args(
    input_path: &Path,
    output_path: &Path,
    options: &ConversionOptions,
) -> Vec<String> {
    let fps = options.fps.unwrap_or(15);

    let scale = build_scale_filter(
        options.width,
        options.height,
        false,
        options.anti_aliasing.unwrap_or(true),
    )
    .unwrap_or_else(|| "scale=iw:ih:flags=lanczos".into());

    let filter = format!(
        "fps={fps},{scale},\
split[s0][s1];\
[s0]palettegen=max_colors={max_colors}:reserve_transparent=0[p];\
[s1][p]paletteuse",
        max_colors = options.max_colors.unwrap_or(256)
    );

    vec![
        "-y".into(),
        "-i".into(),
        path_to_string(input_path),
        "-filter_complex".into(),
        filter,
        path_to_string(output_path),
    ]
}

// ============================================================
// GIF → Video
// ============================================================

fn build_gif_to_video_args(
    input_path: &Path,
    output_path: &Path,
    output_format: FileFormat,
    options: &ConversionOptions,
) -> Vec<String> {
    let mut args = vec!["-y".into(), "-i".into(), path_to_string(input_path)];

    if let Some(scale) = build_scale_filter(
        options.width,
        options.height,
        true,
        options.anti_aliasing.unwrap_or(true),
    ) {
        args.extend(["-vf".into(), scale]);
    } else {
        // H.264 等で奇数サイズが問題になることがあるため、元寸法も偶数化する
        args.extend([
            "-vf".into(),
            "scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos,setsar=1".into(),
        ]);
    }

    if let Some(fps) = options.fps {
        args.push("-r".into());
        args.push(fps.to_string());
    }

    append_video_output_options(&mut args, output_format);

    args.push(path_to_string(output_path));

    args
}

fn build_video_to_audio_args(input_path: &Path, output_path: &Path) -> Vec<String> {
    let mut args = vec![
        "-y".into(),
        "-i".into(),
        path_to_string(input_path),
        "-vn".into(),
    ];

    args.push(path_to_string(output_path));

    args
}

fn append_video_output_options(args: &mut Vec<String>, format: FileFormat) {
    match format {
        FileFormat::Mp4 => {
            args.extend([
                "-c:v".into(),
                "libx264".into(),
                "-pix_fmt".into(),
                "yuv420p".into(),
            ]);
        }

        FileFormat::Webm => {
            args.extend([
                "-c:v".into(),
                "libvpx-vp9".into(),
                "-pix_fmt".into(),
                "yuva420p".into(),
            ]);
        }

        FileFormat::Mov => {
            args.extend([
                "-c:v".into(),
                "libx264".into(),
                "-pix_fmt".into(),
                "yuv420p".into(),
            ]);
        }

        FileFormat::Avi => {
            args.extend(["-c:v".into(), "mpeg4".into()]);
        }

        _ => {}
    }
}

// ============================================================
// Utility
// ============================================================

fn build_scale_filter(
    width: Option<u32>,
    height: Option<u32>,
    require_even: bool,
    anti_aliasing: bool,
) -> Option<String> {
    let flags = if anti_aliasing { "lanczos" } else { "neighbor" };
    let scale = match (width, height) {
        (Some(width), Some(height)) => {
            let width = normalize_dimension(width, require_even);
            let height = normalize_dimension(height, require_even);
            Some(format!("scale={width}:{height}:flags={flags}"))
        }

        (Some(width), None) => {
            let width = normalize_dimension(width, require_even);
            let height = if require_even { -2 } else { -1 };
            Some(format!("scale={width}:{height}:flags={flags}"))
        }

        (None, Some(height)) => {
            let width = if require_even { -2 } else { -1 };
            let height = normalize_dimension(height, require_even);
            Some(format!("scale={width}:{height}:flags={flags}"))
        }

        (None, None) => None,
    }?;

    // 指定したピクセル寸法がそのまま表示寸法になるよう、入力のSARを引き継がない
    Some(format!("{scale},setsar=1"))
}

fn normalize_dimension(value: u32, require_even: bool) -> u32 {
    if !require_even || value.is_multiple_of(2) {
        value
    } else {
        (value + 1).min(16384)
    }
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

#[cfg(test)]
mod tests {
    use super::build_scale_filter;

    #[test]
    fn uses_lanczos_when_anti_aliasing_is_enabled() {
        assert_eq!(
            build_scale_filter(Some(100), Some(100), false, true),
            Some("scale=100:100:flags=lanczos,setsar=1".into()),
        );
    }

    #[test]
    fn uses_nearest_neighbor_when_anti_aliasing_is_disabled() {
        assert_eq!(
            build_scale_filter(Some(100), Some(100), false, false),
            Some("scale=100:100:flags=neighbor,setsar=1".into()),
        );
    }
}
