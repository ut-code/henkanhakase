mod ffmpeg;
mod types;

use std::{
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

pub use types::ConversionRequest;

pub async fn convert(app: &AppHandle, request: ConversionRequest) -> Result<Vec<u8>, String> {
    let workspace = TempWorkspace::new()?;

    let input_path = workspace
        .path()
        .join(format!("input.{}", request.input_format.extension()));

    let output_path = workspace
        .path()
        .join(format!("output.{}", request.output_format.extension()));

    fs::write(&input_path, request.data)
        .map_err(|e| format!("入力ファイルの作成に失敗しました: {e}"))?;

    let args = ffmpeg::build_args(
        &input_path,
        &output_path,
        request.input_format,
        request.output_format,
        &request.options,
    )?;

    let output = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| format!("FFmpeg Sidecar の初期化に失敗しました: {e}"))?
        .args(args)
        .output()
        .await
        .map_err(|e| format!("FFmpeg の実行に失敗しました: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);

        return Err(format!("FFmpeg による変換処理に失敗しました: {stderr}"));
    }

    fs::read(&output_path).map_err(|e| format!("出力ファイルの読み込みに失敗しました: {e}"))
}

struct TempWorkspace {
    path: PathBuf,
}

impl TempWorkspace {
    fn new() -> Result<Self, String> {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| format!("一時ディレクトリ名の生成に失敗しました: {e}"))?
            .as_nanos();

        let name = format!("henkanhakase-{}-{timestamp}", std::process::id());

        let path = std::env::temp_dir().join(name);

        fs::create_dir_all(&path)
            .map_err(|e| format!("一時ディレクトリの作成に失敗しました: {e}"))?;

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
