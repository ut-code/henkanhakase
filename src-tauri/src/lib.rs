mod conversion;

use conversion::ApiError;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{State, WindowEvent};

#[derive(Default)]
pub struct AppState {
    pub cancel_flag: Arc<AtomicBool>,
}

#[tauri::command]
async fn run_ffmpeg(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    args: Vec<String>,
) -> Result<(), ApiError> {
    state.cancel_flag.store(false, Ordering::Relaxed);
    conversion::run_ffmpeg(&app, args, state.cancel_flag.clone())
        .await
        .map_err(ApiError::from)
}

#[tauri::command]
fn cancel_conversion(state: State<'_, AppState>) {
    state.cancel_flag.store(true, Ordering::Relaxed);
}

#[tauri::command]
fn cleanup_temp_file(path: String) {
    conversion::remove_temp_file(&path);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // アプリ起動時に前回の古い一時ディレクトリを初期化・全削除
    conversion::cleanup_temp_dir();

    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            run_ffmpeg,
            cancel_conversion,
            cleanup_temp_file
        ])
        // ウィンドウイベントの監視を追加（アプリ終了時に一時ディレクトリごと削除）
        .on_window_event(|_window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                conversion::cleanup_temp_dir();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
