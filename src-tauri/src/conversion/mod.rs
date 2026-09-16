mod error;
mod ffmpeg;
mod types;

use std::{
    fs,
    path::{Path, PathBuf},
    sync::atomic::{AtomicBool, Ordering},
    sync::Arc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

pub use error::{ApiError, ConversionError, ErrorCode};
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

    let args = ffmpeg::build_args(
        &input_path,
        output_file.path(),
        request.input_format,
        request.output_format,
        &request.options,
    )
    .map_err(|_| ConversionError::new(ErrorCode::InvalidOptions))?;

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

        if let Ok(Some(tauri_plugin_shell::process::CommandEvent::Terminated(payload))) =
            tokio::time::timeout(Duration::from_millis(100), rx.recv()).await
        {
            if payload.code != Some(0) {
                return Err(ConversionError::new(ErrorCode::ConversionFailed));
            }
            break;
        }
    }

    if !output_file.path().exists() {
        return Err(ConversionError::new(ErrorCode::OutputFileNotGenerated));
    }

    let final_path = output_file.disarm();
    Ok(final_path.to_string_lossy().into_owned())
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
