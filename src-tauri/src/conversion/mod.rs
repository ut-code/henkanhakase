mod error;

use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicBool, Ordering},
    sync::Arc,
    time::Duration,
};

use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

pub use error::{ApiError, ConversionError, ErrorCode};

pub fn remove_temp_file(path_str: &str) {
    let path = PathBuf::from(path_str);
    let temp_dir = std::env::temp_dir().join("henkanhakase");

    if path.starts_with(&temp_dir) && path.exists() {
        let _ = fs::remove_file(path);
    }
}

pub fn cleanup_temp_dir() {
    let temp_dir = std::env::temp_dir().join("henkanhakase");
    if temp_dir.exists() {
        let _ = fs::remove_dir_all(&temp_dir);
    }
}

pub async fn run_ffmpeg(
    app: &AppHandle,
    args: Vec<String>,
    cancel_flag: Arc<AtomicBool>,
) -> Result<(), ConversionError> {
    let temp_dir = std::env::temp_dir().join("henkanhakase");
    fs::create_dir_all(&temp_dir)
        .map_err(|_| ConversionError::new(ErrorCode::TempDirCreationFailed))?;

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
            return Ok(());
        }
    }
}
