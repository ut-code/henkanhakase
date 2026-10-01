mod error;
mod ffmpeg;
mod progress;
mod types;

use std::{
    fs,
    path::{Path, PathBuf},
    sync::atomic::{AtomicBool, Ordering},
    sync::Arc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::ShellExt;

pub use error::{ApiError, ConversionError, ErrorCode};
use progress::{percentage, ConversionProgress};
use types::FileFormat;
pub use types::{ConversionRequest, MediaDimensions, MediaProbeRequest};

/// 指定された一時ファイルを明示的に削除する関数
pub fn remove_temp_file(path_str: &str) {
    let path = PathBuf::from(path_str);
    let temp_dir = std::env::temp_dir().join("henkanhakase");

    // セキュリティ対策: 作成した一時ディレクトリ配下のファイルのみ削除を許可
    if path.starts_with(&temp_dir) && path.exists() {
        let _ = fs::remove_file(path);
    }
}

/// アプリ起動時などに一時ディレクトリ内をすべて破棄・再作成する関数
pub fn cleanup_temp_dir() {
    let temp_dir = std::env::temp_dir().join("henkanhakase");
    if temp_dir.exists() {
        let _ = fs::remove_dir_all(&temp_dir);
    }
}

pub async fn convert(
    app: &AppHandle,
    request: ConversionRequest,
    cancel_flag: Arc<AtomicBool>,
) -> Result<String, ConversionError> {
    let input_path = PathBuf::from(&request.input_path);
    if !input_path.exists() {
        return Err(ConversionError::new(ErrorCode::InputFileNotFound));
    }

    let temp_dir = std::env::temp_dir().join("henkanhakase");
    fs::create_dir_all(&temp_dir)
        .map_err(|_| ConversionError::new(ErrorCode::TempDirCreationFailed))?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| ConversionError::new(ErrorCode::TimestampFetchFailed))?
        .as_nanos();

    let output_file = TempFile::new(temp_dir.join(format!(
        "{}_{}.{}",
        request.stem,
        timestamp,
        request.output_format.extension()
    )));

    let duration_ms = request
        .duration_ms
        .or(probe_duration_ms(app, &input_path).await);

    let args = ffmpeg::build_args(
        &input_path,
        output_file.path(),
        request.input_format,
        request.output_format,
        &request.options,
    )
    .map_err(|_| ConversionError::new(ErrorCode::InvalidOptions))?;

    let emit_progress = |progress, state| {
        let _ = app.emit(
            "conversion-progress",
            ConversionProgress {
                conversion_id: request.conversion_id.clone(),
                progress,
                state,
            },
        );
    };
    emit_progress(None, "running");

    let (mut rx, child) = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|_| ConversionError::new(ErrorCode::FfmpegUnavailable))?
        .args(args)
        .spawn()
        .map_err(|_| ConversionError::new(ErrorCode::FfmpegStartFailed))?;

    loop {
        if cancel_flag.load(Ordering::Relaxed) {
            let _ = child.kill();
            return Err(ConversionError::new(ErrorCode::ConversionCancelled));
        }

        if let Ok(Some(event)) = tokio::time::timeout(Duration::from_millis(100), rx.recv()).await {
            match event {
                tauri_plugin_shell::process::CommandEvent::Stdout(bytes) => {
                    if let Ok(output) = std::str::from_utf8(&bytes) {
                        for line in output.lines() {
                            if let Some(progress) = percentage(line.trim(), duration_ms) {
                                emit_progress(Some(progress), "running");
                            }
                        }
                    }
                }
                tauri_plugin_shell::process::CommandEvent::Terminated(payload) => {
                    if payload.code != Some(0) {
                        return Err(ConversionError::new(ErrorCode::ConversionFailed));
                    }
                    break;
                }
                _ => {}
            }
        }
    }

    if !output_file.path().exists() {
        return Err(ConversionError::new(ErrorCode::OutputFileNotGenerated));
    }

    let final_path = output_file.disarm();
    emit_progress(Some(100), "completed");
    Ok(final_path.to_string_lossy().into_owned())
}

async fn probe_duration_ms(app: &AppHandle, input_path: &Path) -> Option<u64> {
    let output = app
        .shell()
        .sidecar("ffmpeg")
        .ok()?
        .args([
            "-hide_banner".into(),
            "-i".into(),
            input_path.to_string_lossy().into_owned(),
        ])
        .output()
        .await
        .ok()?;
    parse_duration_ms(&String::from_utf8_lossy(&output.stderr))
}

fn parse_duration_ms(output: &str) -> Option<u64> {
    let value = output.split("Duration: ").nth(1)?.split(',').next()?.trim();
    let mut fields = value.split(':');
    let hours = fields.next()?.parse::<u64>().ok()?;
    let minutes = fields.next()?.parse::<u64>().ok()?;
    let seconds = fields.next()?.parse::<f64>().ok()?;
    Some(((hours * 3_600 + minutes * 60) as f64 * 1_000.0 + seconds * 1_000.0).round() as u64)
}

pub async fn probe_dimensions(
    app: &AppHandle,
    request: MediaProbeRequest,
) -> Result<MediaDimensions, ConversionError> {
    let input_path = PathBuf::from(&request.input_path);
    if !input_path.exists() {
        return Err(ConversionError::new(ErrorCode::InputFileNotFound));
    }

    let temp_dir = std::env::temp_dir().join("henkanhakase");
    fs::create_dir_all(&temp_dir)
        .map_err(|_| ConversionError::new(ErrorCode::TempDirCreationFailed))?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| ConversionError::new(ErrorCode::TimestampFetchFailed))?
        .as_nanos();

    let probe_file = TempFile::new(temp_dir.join(format!("probe_{}.png", timestamp)));

    let output = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|_| ConversionError::new(ErrorCode::FfmpegUnavailable))?
        .args([
            "-y".to_string(),
            "-i".to_string(),
            input_path.to_string_lossy().into_owned(),
            "-frames:v".to_string(),
            "1".to_string(),
            "-f".to_string(),
            "image2pipe".to_string(),
            "-vcodec".to_string(),
            "png".to_string(),
            probe_file.path().to_string_lossy().into_owned(),
        ])
        .output()
        .await
        .map_err(|_| ConversionError::new(ErrorCode::ProbeFailed))?;

    if !output.status.success() {
        return Err(ConversionError::new(ErrorCode::ProbeFailed));
    }

    let probe_data =
        fs::read(probe_file.path()).map_err(|_| ConversionError::new(ErrorCode::ProbeFailed))?;

    parse_png_dimensions(&probe_data)
}

pub async fn generate_thumbnail(
    app: &AppHandle,
    request: MediaProbeRequest,
) -> Result<Vec<u8>, ConversionError> {
    let input_path = PathBuf::from(&request.input_path);
    if !input_path.exists() {
        return Err(ConversionError::new(ErrorCode::InputFileNotFound));
    }

    let temp_dir = std::env::temp_dir().join("henkanhakase");
    fs::create_dir_all(&temp_dir)
        .map_err(|_| ConversionError::new(ErrorCode::TempDirCreationFailed))?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| ConversionError::new(ErrorCode::TimestampFetchFailed))?
        .as_nanos();

    let is_gif = request.input_format == FileFormat::Gif;
    let thumbnail_file = TempFile::new(temp_dir.join(format!(
        "thumbnail_{}.{}",
        timestamp,
        if is_gif { "png" } else { "jpg" }
    )));

    let mut args = vec![
        "-y".to_string(),
        "-i".to_string(),
        input_path.to_string_lossy().into_owned(),
        "-an".to_string(),
        "-vf".to_string(),
        "thumbnail=30,scale=iw*sar:ih,setsar=1,scale=640:640:force_original_aspect_ratio=decrease"
            .to_string(),
        "-frames:v".to_string(),
        "1".to_string(),
        "-update".to_string(),
        "1".to_string(),
    ];
    if !is_gif {
        args.extend(["-q:v".to_string(), "4".to_string()]);
    }
    args.push(thumbnail_file.path().to_string_lossy().into_owned());

    let output = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|_| ConversionError::new(ErrorCode::FfmpegUnavailable))?
        .args(args)
        .output()
        .await
        .map_err(|_| ConversionError::new(ErrorCode::ThumbnailFailed))?;

    if !output.status.success() {
        return Err(ConversionError::new(ErrorCode::ThumbnailFailed));
    }

    fs::read(thumbnail_file.path()).map_err(|_| ConversionError::new(ErrorCode::ThumbnailFailed))
}

fn parse_png_dimensions(data: &[u8]) -> Result<MediaDimensions, ConversionError> {
    const PNG_SIGNATURE: &[u8; 8] = b"\x89PNG\r\n\x1a\n";

    if data.len() < 24 || &data[..8] != PNG_SIGNATURE || &data[12..16] != b"IHDR" {
        return Err(ConversionError::new(ErrorCode::ProbeFailed));
    }

    let width = u32::from_be_bytes(data[16..20].try_into().unwrap());
    let height = u32::from_be_bytes(data[20..24].try_into().unwrap());

    if width == 0 || height == 0 {
        return Err(ConversionError::new(ErrorCode::ProbeFailed));
    }

    Ok(MediaDimensions { width, height })
}

/// スコープを抜けた際（エラー時やキャンセル時含む）に一時ファイルを自動削除するRAIIガード
pub struct TempFile {
    path: PathBuf,
    keep: bool,
}

impl TempFile {
    pub fn new(path: PathBuf) -> Self {
        Self { path, keep: false }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn disarm(mut self) -> PathBuf {
        self.keep = true;
        self.path.clone()
    }
}

impl Drop for TempFile {
    fn drop(&mut self) {
        if !self.keep && self.path.exists() {
            let _ = fs::remove_file(&self.path);
        }
    }
}
