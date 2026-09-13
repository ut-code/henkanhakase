mod ffmpeg;
mod types;

use std::{
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

pub use types::{ConversionRequest, MediaDimensions, MediaProbeRequest};
use types::FileFormat;

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

pub async fn probe_dimensions(
    app: &AppHandle,
    request: MediaProbeRequest,
) -> Result<MediaDimensions, String> {
    let workspace = TempWorkspace::new()?;
    let input_path = workspace
        .path()
        .join(format!("input.{}", request.input_format.extension()));
    let probe_path = workspace.path().join("probe.png");

    fs::write(&input_path, request.data)
        .map_err(|e| format!("入力ファイルの作成に失敗しました: {e}"))?;

    let output = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| format!("FFmpeg Sidecar の初期化に失敗しました: {e}"))?
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
        .map_err(|e| format!("メディアサイズの取得に失敗しました: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("メディアサイズの取得に失敗しました: {stderr}"));
    }

    let probe_data = fs::read(&probe_path)
        .map_err(|e| format!("サイズ取得結果の読み込みに失敗しました: {e}"))?;

    parse_png_dimensions(&probe_data)
}

pub async fn generate_thumbnail(
    app: &AppHandle,
    request: MediaProbeRequest,
) -> Result<Vec<u8>, String> {
    let workspace = TempWorkspace::new()?;
    let input_path = workspace
        .path()
        .join(format!("input.{}", request.input_format.extension()));
    let is_gif = request.input_format == FileFormat::Gif;
    let thumbnail_path = workspace
        .path()
        .join(if is_gif { "thumbnail.png" } else { "thumbnail.jpg" });

    fs::write(&input_path, request.data)
        .map_err(|e| format!("入力ファイルの作成に失敗しました: {e}"))?;

    let mut args = vec![
        "-y".to_string(),
        "-i".to_string(),
        input_path.to_string_lossy().into_owned(),
        "-an".to_string(),
        "-vf".to_string(),
        "thumbnail=30,scale=iw*sar:ih,setsar=1,scale=640:640:force_original_aspect_ratio=decrease".to_string(),
        "-frames:v".to_string(),
        "1".to_string(),
        "-update".to_string(),
        "1".to_string(),
    ];
    if !is_gif {
        args.extend(["-q:v".to_string(), "4".to_string()]);
    }
    args.push(thumbnail_path.to_string_lossy().into_owned());

    let output = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| format!("FFmpeg Sidecar の初期化に失敗しました: {e}"))?
        .args(args)
        .output()
        .await
        .map_err(|e| format!("サムネイルの生成に失敗しました: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("サムネイルの生成に失敗しました: {stderr}"));
    }

    fs::read(&thumbnail_path).map_err(|e| format!("サムネイルの読み込みに失敗しました: {e}"))
}

fn parse_png_dimensions(data: &[u8]) -> Result<MediaDimensions, String> {
    const PNG_SIGNATURE: &[u8; 8] = b"\x89PNG\r\n\x1a\n";

    if data.len() < 24 || &data[..8] != PNG_SIGNATURE || &data[12..16] != b"IHDR" {
        return Err("FFmpegから有効な画像サイズを取得できませんでした".into());
    }

    let width = u32::from_be_bytes(data[16..20].try_into().unwrap());
    let height = u32::from_be_bytes(data[20..24].try_into().unwrap());

    if width == 0 || height == 0 {
        return Err("取得した画像サイズが不正です".into());
    }

    Ok(MediaDimensions { width, height })
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
