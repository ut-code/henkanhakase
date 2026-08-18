use tauri_plugin_shell::ShellExt;

#[tauri::command]
async fn convert_file(
    app: tauri::AppHandle,
    data: Vec<u8>,
    stem: String,
    format: String,
) -> Result<Vec<u8>, String> {
    let temp_dir = std::env::temp_dir();
    let in_path = temp_dir.join(format!("{}.tmp", stem));
    let out_path = temp_dir.join(format!("{}.{}", stem, format.to_lowercase()));

    std::fs::write(&in_path, data)
        .map_err(|e| format!("入力ファイルの作成に失敗しました: {}", e))?;

    let output = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| format!("FFmpeg Sidecar の初期化に失敗しました: {}", e))?
        .args([
            "-i",
            in_path.to_str().unwrap_or_default(),
            out_path.to_str().unwrap_or_default(),
        ])
        .output()
        .await
        .map_err(|e| {
            let _ = std::fs::remove_file(&in_path);
            format!("FFmpeg の実行に失敗しました: {}", e)
        })?;

    let _ = std::fs::remove_file(&in_path);

    if !output.status.success() {
        let _ = std::fs::remove_file(&out_path);
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg による変換処理に失敗しました: {}", stderr));
    }

    let output_data = std::fs::read(&out_path).map_err(|e| {
        let _ = std::fs::remove_file(&out_path);
        format!("出力ファイルの読み込みに失敗しました: {}", e)
    })?;

    let _ = std::fs::remove_file(&out_path);

    Ok(output_data)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![convert_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
