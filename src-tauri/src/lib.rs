mod conversion;

use conversion::ConversionRequest;

#[tauri::command]
async fn convert_file(
    app: tauri::AppHandle,
    request: ConversionRequest,
) -> Result<Vec<u8>, String> {
    conversion::convert(&app, request).await
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
