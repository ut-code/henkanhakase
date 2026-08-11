use std::process::Command;

#[tauri::command]
fn convert_file(data: Vec<u8>, stem: String, format: String) -> Result<Vec<u8>, String> {
    let temp_dir = std::env::temp_dir();
    let in_path = temp_dir.join(format!("{}.tmp", stem));
    let out_path = temp_dir.join(format!("{}.{}", stem, format.to_lowercase()));

    std::fs::write(&in_path, data).map_err(|e| format!("入力ファイルの作成に失敗しました: {}", e))?;

    let ffmpeg_cmd = if Command::new("ffmpeg").arg("-version").output().is_ok() {
        "ffmpeg"
    } else if std::path::Path::new("/opt/homebrew/bin/ffmpeg").exists() {
        "/opt/homebrew/bin/ffmpeg"
    } else if std::path::Path::new("/usr/local/bin/ffmpeg").exists() {
        "/usr/local/bin/ffmpeg"
    } else {
        let _ = std::fs::remove_file(&in_path);
        return Err("システムに FFmpeg が見つかりませんでした。FFmpeg をインストールしてください。".to_string());
    };

    let mut cmd = Command::new(ffmpeg_cmd);
    cmd.args(["-y", "-i"]).arg(&in_path);

    let status = cmd
        .arg(&out_path)
        .status()
        .map_err(|e| {
            let _ = std::fs::remove_file(&in_path);
            format!("FFmpeg の実行に失敗しました: {}", e)
        })?;

    let _ = std::fs::remove_file(&in_path);

    if !status.success() {
        let _ = std::fs::remove_file(&out_path);
        return Err("FFmpeg による変換処理に失敗しました。".to_string());
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
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![convert_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
