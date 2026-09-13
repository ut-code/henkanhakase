mod conversion;

use conversion::{ApiError, ConversionRequest, MediaDimensions, MediaProbeRequest};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::State;

#[derive(Default)]
pub struct AppState {
    pub cancel_flag: Arc<AtomicBool>,
}

#[tauri::command]
async fn convert_file(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    request: ConversionRequest,
) -> Result<String, ApiError> {
    // 変換開始時にキャンセルフラグを「false（未キャンセル）」にリセット
    state.cancel_flag.store(false, Ordering::Relaxed);

    // conversion モジュールに cancel_flag (Arc<AtomicBool>) を渡して処理を実行
    conversion::convert(&app, request, state.cancel_flag.clone())
        .await
        .map_err(ApiError::from)
}

#[tauri::command]
fn cancel_conversion(state: State<'_, AppState>) {
    // フラグを「true（キャンセル済み）」に更新
    state.cancel_flag.store(true, Ordering::Relaxed);
}

#[tauri::command]
async fn probe_media_dimensions(
    app: tauri::AppHandle,
    request: MediaProbeRequest,
) -> Result<MediaDimensions, ApiError> {
    conversion::probe_dimensions(&app, request)
        .await
        .map_err(ApiError::from)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            convert_file,
            probe_media_dimensions,
            cancel_conversion
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
