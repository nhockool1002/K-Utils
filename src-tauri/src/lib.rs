mod commands;
mod convert;
mod ffmpeg;
mod photo;
mod state;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(state::AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::probe_media,
            commands::start_video_job,
            commands::preview_video_frame,
            commands::cancel_job,
            commands::get_logs,
            commands::clear_logs,
            commands::list_photo_presets,
            commands::preview_photo,
            commands::apply_photo_job,
            commands::parse_lightroom_preset,
            commands::convert_image,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
