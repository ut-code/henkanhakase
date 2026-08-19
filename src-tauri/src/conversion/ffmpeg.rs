use std::path::Path;

use super::types::{ConversionOptions, FileFormat};

pub fn build_args(
    input_path: &Path,
    output_path: &Path,
    input_format: FileFormat,
    output_format: FileFormat,
    options: &ConversionOptions,
) -> Result<Vec<String>, String> {
    options.validate()?;

    if input_format.is_video() && output_format == FileFormat::Gif {
        return Ok(build_video_to_gif_args(
            input_path,
            output_path,
            options,
        ));
    }

    if input_format == FileFormat::Gif && output_format.is_video() {
        return Ok(build_gif_to_video_args(
            input_path,
            output_path,
            output_format,
            options,
        ));
    }

    // 既存の変換はこれまでと同様 FFmpeg に任せる
    Ok(build_default_args(input_path, output_path))
}

fn build_default_args(
    input_path: &Path,
    output_path: &Path,
) -> Vec<String> {
    vec![
        "-y".into(),
        "-i".into(),
        path_to_string(input_path),
        path_to_string(output_path),
    ]
}

fn build_video_to_gif_args(
    input_path: &Path,
    output_path: &Path,
    options: &ConversionOptions,
) -> Vec<String> {
    let fps = options.fps.unwrap_or(15);

    let scale = build_scale_filter(
        options.width.or(Some(640)),
        options.height,
    );

    let filter = format!(
        "fps={fps},{scale}:flags=lanczos,\
split[s0][s1];\
[s0]palettegen[p];\
[s1][p]paletteuse"
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

fn build_gif_to_video_args(
    input_path: &Path,
    output_path: &Path,
    output_format: FileFormat,
    options: &ConversionOptions,
) -> Vec<String> {
    let mut args = vec![
        "-y".into(),
        "-i".into(),
        path_to_string(input_path),
    ];

    let scale = match (options.width, options.height) {
        (Some(width), Some(height)) => {
            format!("scale={}:{}", make_even(width), make_even(height))
        }

        (Some(width), None) => {
            format!(
                "scale={}:trunc(ow/a/2)*2",
                make_even(width)
            )
        }

        (None, Some(height)) => {
            format!(
                "scale=trunc(oh*a/2)*2:{}",
                make_even(height)
            )
        }

        (None, None) => {
            // H.264 等で奇数サイズが問題になることがあるため偶数化
            "scale=trunc(iw/2)*2:trunc(ih/2)*2".into()
        }
    };

    args.push("-vf".into());
    args.push(scale);

    if let Some(fps) = options.fps {
        args.push("-r".into());
        args.push(fps.to_string());
    }

    // MP4 / MOV は互換性を考えて yuv420p にする
    if matches!(output_format, FileFormat::Mp4 | FileFormat::Mov) {
        args.push("-pix_fmt".into());
        args.push("yuv420p".into());
    }

    args.push(path_to_string(output_path));

    args
}

fn build_scale_filter(
    width: Option<u32>,
    height: Option<u32>,
) -> String {
    match (width, height) {
        (Some(width), Some(height)) => {
            format!("scale={width}:{height}")
        }

        (Some(width), None) => {
            format!("scale={width}:-1")
        }

        (None, Some(height)) => {
            format!("scale=-1:{height}")
        }

        (None, None) => {
            "scale=iw:ih".into()
        }
    }
}

fn make_even(value: u32) -> u32 {
    if value % 2 == 0 {
        value
    } else {
        value - 1
    }
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}