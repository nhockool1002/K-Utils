use crate::convert;
use crate::ffmpeg::{self, MediaInfo, VideoJobOptions};
use crate::photo::{self, PhotoFilterParams, PhotoPreset};
use crate::state::{AppState, LogEntry};
use serde::Serialize;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn probe_media(app: AppHandle, path: String) -> Result<MediaInfo, String> {
    ffmpeg::probe_media(&app, &path).await
}

#[tauri::command]
pub async fn start_video_job(
    app: AppHandle,
    state: State<'_, AppState>,
    job_id: String,
    input: String,
    subtitle: Option<String>,
    output: String,
    options: VideoJobOptions,
) -> Result<(), String> {
    ffmpeg::start_video_job(app, state, job_id, input, subtitle, output, options).await
}

#[tauri::command]
pub async fn preview_video_frame(
    app: AppHandle,
    input: String,
    subtitle: Option<String>,
    options: VideoJobOptions,
    seek_seconds: Option<f64>,
) -> Result<String, String> {
    ffmpeg::preview_video(app, input, subtitle, options, seek_seconds).await
}

#[tauri::command]
pub fn cancel_job(state: State<'_, AppState>, job_id: String) -> Result<(), String> {
    ffmpeg::cancel_job(&state, &job_id)
}

#[derive(Serialize)]
pub struct LogEntryOut {
    pub timestamp_ms: i64,
    pub level: String,
    pub message: String,
}

#[tauri::command]
pub fn get_logs(state: State<'_, AppState>) -> Result<Vec<LogEntryOut>, String> {
    let logs = state.logs.lock().map_err(|e| e.to_string())?;
    Ok(logs
        .iter()
        .map(|e: &LogEntry| LogEntryOut {
            timestamp_ms: e.timestamp_ms,
            level: e.level.clone(),
            message: e.message.clone(),
        })
        .collect())
}

#[tauri::command]
pub fn clear_logs(state: State<'_, AppState>) -> Result<(), String> {
    let mut logs = state.logs.lock().map_err(|e| e.to_string())?;
    logs.clear();
    Ok(())
}

#[tauri::command]
pub async fn list_photo_presets() -> Vec<PhotoPreset> {
    photo::list_photo_presets().await
}

#[tauri::command]
pub async fn preview_photo(
    app: AppHandle,
    input: String,
    params: PhotoFilterParams,
) -> Result<String, String> {
    photo::preview_photo(app, input, params).await
}

#[tauri::command]
pub async fn apply_photo_job(
    app: AppHandle,
    input: String,
    output: String,
    params: PhotoFilterParams,
) -> Result<String, String> {
    photo::apply_photo_job(app, input, output, params).await
}

#[tauri::command]
pub async fn parse_lightroom_preset(path: String) -> Result<PhotoFilterParams, String> {
    photo::parse_lightroom_preset(path).await
}

#[tauri::command]
pub async fn convert_image(
    input: String,
    output: String,
    quality: Option<u32>,
) -> Result<String, String> {
    convert::convert_image(input, output, quality).await
}
