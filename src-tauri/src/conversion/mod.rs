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

pub async fn convert(
    app: &AppHandle,
    request: ConversionRequest,
    cancel_flag: Arc<AtomicBool>,
) -> Result<Vec<u8>, ConversionError> {
    let workspace = TempWorkspace::new()?;

    let input_path = workspace
        .path()
        .join(format!("input.{}", request.input_format.extension()));
    let output_path = workspace
        .path()
        .join(format!("output.{}", request.output_format.extension()));

    fs::write(&input_path, request.data)
        .map_err(|_| ConversionError::new(ErrorCode::InputWriteFailed))?;

    let args = ffmpeg::build_args(
        &input_path,
        &output_path,
        request.input_format,
        request.output_format,
        &request.options,
    )
    .map_err(|_| ConversionError::new(ErrorCode::InvalidOptions))?;

    // 1. .output() ではなく .spawn() を使用してプロセスを起動する
    let (mut rx, child) = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|_| ConversionError::new(ErrorCode::FfmpegUnavailable))?
        .args(args)
        .spawn()
        .map_err(|_| ConversionError::new(ErrorCode::FfmpegStartFailed))?;

    // 2. FFmpeg の実行完了、またはキャンセルフラグの変更を非同期にループ監視する
    loop {
        // フロントエンドから cancel_conversion が呼ばれたかをチェック
        if cancel_flag.load(Ordering::Relaxed) {
            // FFmpeg プロセスを強制終了する
            let _ = child.kill();
            return Err(ConversionError::new(ErrorCode::ConversionCancelled));
        }

        // FFmpeg からのイベント（出力ログや終了通知）を確認する
        if let Ok(Some(tauri_plugin_shell::process::CommandEvent::Terminated(payload))) =
            tokio::time::timeout(Duration::from_millis(100), rx.recv()).await
        {
            if payload.code != Some(0) {
                return Err(ConversionError::new(ErrorCode::ConversionFailed));
            }
            // 正常終了したためループを抜ける
            break;
        }
    }

    fs::read(&output_path).map_err(|_| ConversionError::new(ErrorCode::OutputReadFailed))
}

pub async fn probe_dimensions(
    app: &AppHandle,
    request: MediaProbeRequest,
) -> Result<MediaDimensions, ConversionError> {
    let workspace = TempWorkspace::new()?;
    let input_path = workspace
        .path()
        .join(format!("input.{}", request.input_format.extension()));
    let probe_path = workspace.path().join("probe.png");

    fs::write(&input_path, request.data)
        .map_err(|_| ConversionError::new(ErrorCode::InputWriteFailed))?;

    let output = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|_| ConversionError::new(ErrorCode::FfmpegUnavailable))?
        .args([
            "-i".to_string(),
            input_path.to_string_lossy().into_owned(),
            "-frames:v".to_string(),
            "1".to_string(),
            "-f".to_string(),
            "image2pipe".to_string(),
            "-vcodec".to_string(),
            "png".to_string(),
            probe_path.to_string_lossy().into_owned(),
        ])
        .output()
        .await
        .map_err(|_| ConversionError::new(ErrorCode::ProbeFailed))?;

    if !output.status.success() {
        return Err(ConversionError::new(ErrorCode::ProbeFailed));
    }

    let probe_data =
        fs::read(&probe_path).map_err(|_| ConversionError::new(ErrorCode::ProbeFailed))?;

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

struct TempWorkspace {
    path: PathBuf,
}

impl TempWorkspace {
    fn new() -> Result<Self, ConversionError> {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| ConversionError::new(ErrorCode::InputWriteFailed))?
            .as_nanos();

        let name = format!("henkanhakase-{}-{timestamp}", std::process::id());

        let path = std::env::temp_dir().join(name);

        fs::create_dir_all(&path).map_err(|_| ConversionError::new(ErrorCode::InputWriteFailed))?;

        Ok(Self { path })
    }

    fn path(&self) -> &Path {
        &self.path
    }
}

impl Drop for TempWorkspace {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}
