mod error;
mod ffmpeg;
mod types;

use std::{
    fs,
    path::PathBuf,
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
) -> Result<String, ConversionError> {
    // 1. 入力ファイルの存在チェック（絶対パス）
    let input_path = PathBuf::from(&request.input_path);
    if !input_path.exists() {
        return Err(ConversionError::new(ErrorCode::InputFileNotFound));
    }

    // 2. 一時出力先ディレクトリの準備
    let temp_dir = std::env::temp_dir().join("henkanhakase");
    fs::create_dir_all(&temp_dir)
        .map_err(|_| ConversionError::new(ErrorCode::TempDirCreationFailed))?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| ConversionError::new(ErrorCode::TimestampFetchFailed))?
        .as_nanos();

    // 出力先一時ファイルの絶対パス
    let output_path = temp_dir.join(format!(
        "{}_{}.{}",
        request.stem,
        timestamp,
        request.output_format.extension()
    ));

    // 3. FFmpeg 引数の組み立て (絶対パス同士で指定)
    let args = ffmpeg::build_args(
        &input_path,
        &output_path,
        request.input_format,
        request.output_format,
        &request.options,
    )
    .map_err(|_| ConversionError::new(ErrorCode::InvalidOptions))?;

    // 4. Sidecar (FFmpeg) の起動
    let (mut rx, child) = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|_| ConversionError::new(ErrorCode::FfmpegUnavailable))?
        .args(args)
        .spawn()
        .map_err(|_| ConversionError::new(ErrorCode::FfmpegStartFailed))?;

    // 5. キャンセル監視付きの非同期実行ループ
    loop {
        if cancel_flag.load(Ordering::Relaxed) {
            let _ = child.kill();
            // キャンセル時は一時ファイルを削除
            let _ = fs::remove_file(&output_path);
            return Err(ConversionError::new(ErrorCode::ConversionCancelled));
        }

        if let Ok(Some(tauri_plugin_shell::process::CommandEvent::Terminated(payload))) =
            tokio::time::timeout(Duration::from_millis(100), rx.recv()).await
        {
            if payload.code != Some(0) {
                let _ = fs::remove_file(&output_path);
                return Err(ConversionError::new(ErrorCode::ConversionFailed));
            }
            break;
        }
    }

    // 出力ファイルが正常に生成されたことを確認してパス文字列を返す
    if !output_path.exists() {
        return Err(ConversionError::new(ErrorCode::OutputFileNotGenerated));
    }

    Ok(output_path.to_string_lossy().into_owned())
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

    let probe_path = temp_dir.join(format!("probe_{}.png", timestamp));

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
            probe_path.to_string_lossy().into_owned(),
        ])
        .output()
        .await
        .map_err(|_| ConversionError::new(ErrorCode::ProbeFailed))?;

    if !output.status.success() {
        let _ = fs::remove_file(&probe_path);
        return Err(ConversionError::new(ErrorCode::ProbeFailed));
    }

    let probe_data =
        fs::read(&probe_path).map_err(|_| ConversionError::new(ErrorCode::ProbeFailed))?;

    // 解析後、一時プローブ画像は不要のため即時削除
    let _ = fs::remove_file(&probe_path);

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
