use crate::photo::{self, PhotoFilterParams};
use base64::Engine;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

#[derive(Clone, Serialize)]
pub struct ProgressPayload {
    pub job_id: String,
    pub percent: f64,
    pub speed: Option<f64>,
    pub fps: Option<f64>,
    pub eta_seconds: Option<f64>,
}

#[derive(Clone, Serialize)]
pub struct JobDonePayload {
    pub job_id: String,
    pub output_path: String,
}

#[derive(Clone, Serialize)]
pub struct JobErrorPayload {
    pub job_id: String,
    pub message: String,
}

#[derive(Clone, Serialize)]
pub struct LogPayload {
    pub timestamp_ms: i64,
    pub level: String,
    pub message: String,
}

#[derive(Serialize, Clone)]
pub struct MediaInfo {
    pub duration: f64,
    pub width: i64,
    pub height: i64,
    pub codec: String,
    pub has_audio: bool,
    pub bit_rate: i64,
}

/// One combined video job. Every field below is an independently toggled
/// capability on the frontend — rotate, crop, speed, subtitles and compress
/// all compose into a single ffmpeg invocation (one pass, one re-encode)
/// instead of chaining separate jobs.
#[derive(Deserialize, Clone)]
pub struct VideoJobOptions {
    /// 0, 90, 180 or 270 (clockwise degrees).
    pub rotate: i32,
    pub flip_h: bool,
    pub flip_v: bool,
    /// None = no crop. Otherwise "1:1" | "9:16" | "16:9" | "4:3".
    pub crop_aspect: Option<String>,
    /// 1.0 = normal speed.
    pub speed: f64,
    /// "none" | "soft" | "hard".
    pub subtitle_mode: String,
    pub font_size: u32,
    pub font_color: String,
    pub outline_color: String,
    pub position: String,
    pub compress: bool,
    pub encoder: String,
    pub quality: String,
    pub resolution: Option<String>,
    pub audio_bitrate: String,
    pub mute_audio: bool,
    /// Optional color-grading "look" (same engine as the Photo tab) applied
    /// right after geometry transforms and before any subtitle burn-in, so
    /// burned-in subtitle text stays crisp and ungraded.
    pub grading: Option<PhotoFilterParams>,
}

/// Escapes a filesystem path for safe embedding inside an ffmpeg filtergraph
/// argument (e.g. subtitles=<path>). The `subtitles` filter re-parses its
/// filename through multiple levels of the filtergraph escaping grammar, so
/// a ':' needs two backslashes and '\\', '\'', ',', '[', ']', ';' need three
/// (verified empirically against ffmpeg 8.0 — single/standard escaping is
/// not enough and leaves the path and later options mis-parsed).
fn escape_filter_path(path: &str) -> String {
    let mut out = String::with_capacity(path.len());
    for ch in path.chars() {
        match ch {
            ':' => out.push_str("\\\\:"),
            '\\' | '\'' | ',' | '[' | ']' | ';' => {
                out.push_str("\\\\\\");
                out.push(ch);
            }
            other => out.push(other),
        }
    }
    out
}

/// Converts a "#RRGGBB" hex color into ASS's &H00BBGGRR& color format.
fn hex_to_ass_color(hex: &str) -> String {
    let h = hex.trim_start_matches('#');
    if h.len() != 6 {
        return "&H00FFFFFF&".to_string();
    }
    let r = &h[0..2];
    let g = &h[2..4];
    let b = &h[4..6];
    format!("&H00{}{}{}&", b, g, r)
}

fn scale_filter(resolution: &Option<String>) -> Option<String> {
    match resolution.as_deref() {
        None | Some("source") => None,
        Some(h) => Some(format!("scale=-2:{}", h)),
    }
}

fn is_hardware_encoder(encoder: &str) -> bool {
    encoder == "h264_videotoolbox" || encoder == "hevc_videotoolbox"
}

/// Quality value to use when the user asked to preserve source quality
/// instead of applying the normal quality preset (used whenever compress
/// is off but some other transform still forces a re-encode).
fn preserve_quality_value(encoder: &str, info: &MediaInfo) -> String {
    if is_hardware_encoder(encoder) {
        let kbps = if info.bit_rate > 0 {
            (info.bit_rate / 1000).max(1500)
        } else {
            8000
        };
        format!("{}k", kbps)
    } else {
        "16".to_string()
    }
}

fn encoder_args(encoder: &str, quality: &str) -> Vec<String> {
    match encoder {
        "h264_videotoolbox" | "hevc_videotoolbox" => {
            let mut args = vec![
                "-c:v".into(),
                encoder.into(),
                "-b:v".into(),
                quality.into(),
                "-allow_sw".into(),
                "1".into(),
            ];
            if encoder == "hevc_videotoolbox" {
                args.push("-tag:v".into());
                args.push("hvc1".into());
            }
            args
        }
        "libx264" | "libx265" => {
            let mut args = vec![
                "-c:v".into(),
                encoder.into(),
                "-crf".into(),
                quality.into(),
                "-preset".into(),
                "medium".into(),
            ];
            if encoder == "libx265" {
                args.push("-tag:v".into());
                args.push("hvc1".into());
            }
            args
        }
        other => vec!["-c:v".into(), other.into()],
    }
}

/// Crop a centered region matching a target aspect ratio out of whatever
/// the current frame is (this runs after rotate, so `iw`/`ih` already
/// reflect any 90°/270° swap). Uses ffmpeg's crop-filter default of
/// centering when x/y are omitted.
fn crop_filter_expr(aspect: &str) -> Option<String> {
    let (w, h): (f64, f64) = match aspect {
        "1:1" => (1.0, 1.0),
        "9:16" => (9.0, 16.0),
        "16:9" => (16.0, 9.0),
        "4:3" => (4.0, 3.0),
        _ => return None,
    };
    Some(format!(
        "crop=min(iw\\,ih*{w}/{h}):min(ih\\,iw*{h}/{w})",
        w = w,
        h = h
    ))
}

fn rotate_filters(rotate: i32) -> Vec<String> {
    match rotate {
        90 => vec!["transpose=1".to_string()],
        180 => vec!["hflip".to_string(), "vflip".to_string()],
        270 => vec!["transpose=2".to_string()],
        _ => vec![],
    }
}

/// `atempo` only accepts [0.5, 2.0] per stage, so extreme speed changes are
/// expressed as a chain of stages that multiply out to the target speed.
fn atempo_chain(speed: f64) -> Vec<String> {
    let mut stages: Vec<f64> = Vec::new();
    let mut remaining = speed;
    while remaining > 2.0 {
        stages.push(2.0);
        remaining /= 2.0;
    }
    while remaining < 0.5 {
        stages.push(0.5);
        remaining /= 0.5;
    }
    stages.push(remaining);
    stages
        .into_iter()
        .map(|s| format!("atempo={:.4}", s))
        .collect()
}

/// Shared geometric transforms: rotate → flip → crop → scale, in the order
/// a viewer would expect them to compose. Used by both the real job and the
/// preview frame so what you see in "Xem trước" matches the final output.
fn build_transform_chain(opts: &VideoJobOptions) -> Vec<String> {
    let mut parts = Vec::new();
    parts.extend(rotate_filters(opts.rotate));
    if opts.flip_h {
        parts.push("hflip".to_string());
    }
    if opts.flip_v {
        parts.push("vflip".to_string());
    }
    if let Some(aspect) = &opts.crop_aspect {
        if let Some(cf) = crop_filter_expr(aspect) {
            parts.push(cf);
        }
    }
    if opts.compress {
        if let Some(sf) = scale_filter(&opts.resolution) {
            parts.push(sf);
        }
    }
    if let Some(g) = &opts.grading {
        let scaled = photo::scale_params_by_intensity(g);
        parts.extend(photo::grading_filter_chain(&scaled));
    }
    parts
}

fn hardsub_style_filter(subtitle: &str, fonts_dir: &str, options: &VideoJobOptions) -> String {
    let alignment = if options.position == "top" { 8 } else { 2 };
    let style = format!(
        "FontSize={},PrimaryColour={},OutlineColour={},BorderStyle=1,Outline=2,Shadow=0,Alignment={}",
        options.font_size,
        hex_to_ass_color(&options.font_color),
        hex_to_ass_color(&options.outline_color),
        alignment
    );
    format!(
        "subtitles={}:fontsdir={}:force_style='{}'",
        escape_filter_path(subtitle),
        escape_filter_path(fonts_dir),
        style
    )
}

fn resolve_fonts_dir(app: &AppHandle) -> String {
    app.path()
        .resource_dir()
        .ok()
        .map(|p| p.join("fonts"))
        .filter(|p| p.exists())
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "/System/Library/Fonts".to_string())
}

pub async fn probe_media(app: &AppHandle, path: &str) -> Result<MediaInfo, String> {
    let sidecar = app
        .shell()
        .sidecar("ffprobe")
        .map_err(|e| e.to_string())?
        .args([
            "-v",
            "error",
            "-show_entries",
            "format=duration,bit_rate:stream=width,height,codec_name,codec_type",
            "-of",
            "json",
            path,
        ]);

    let output = sidecar.output().await.map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    let json: serde_json::Value =
        serde_json::from_slice(&output.stdout).map_err(|e| e.to_string())?;

    let duration = json["format"]["duration"]
        .as_str()
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);
    let bit_rate = json["format"]["bit_rate"]
        .as_str()
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(0);

    let mut width = 0i64;
    let mut height = 0i64;
    let mut codec = String::new();
    let mut has_audio = false;

    if let Some(streams) = json["streams"].as_array() {
        for s in streams {
            let ctype = s["codec_type"].as_str().unwrap_or("");
            if ctype == "video" && width == 0 {
                width = s["width"].as_i64().unwrap_or(0);
                height = s["height"].as_i64().unwrap_or(0);
                codec = s["codec_name"].as_str().unwrap_or("").to_string();
            } else if ctype == "audio" {
                has_audio = true;
            }
        }
    }

    Ok(MediaInfo {
        duration,
        width,
        height,
        codec,
        has_audio,
        bit_rate,
    })
}

fn emit_log(app: &AppHandle, state: &crate::state::AppState, level: &str, message: String) {
    state.push_log(level, message.clone());
    let _ = app.emit(
        "app-log",
        LogPayload {
            timestamp_ms: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis() as i64)
                .unwrap_or(0),
            level: level.to_string(),
            message,
        },
    );
}

async fn run_ffmpeg_job(
    app: &AppHandle,
    state: &tauri::State<'_, crate::state::AppState>,
    job_id: String,
    args: Vec<String>,
    output_path: String,
    total_duration: f64,
) -> Result<(), String> {
    emit_log(
        app,
        state,
        "info",
        format!("Bắt đầu job {} -> {}", job_id, output_path),
    );

    let sidecar = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| e.to_string())?
        .args(args);

    let (mut rx, child) = sidecar.spawn().map_err(|e| e.to_string())?;

    {
        let mut jobs = state.jobs.lock().map_err(|e| e.to_string())?;
        jobs.insert(job_id.clone(), child);
    }

    let mut cur_fps: Option<f64> = None;
    let mut cur_speed: Option<f64> = None;
    let mut stderr_tail: Vec<String> = Vec::new();
    let mut finished_ok = false;

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(bytes) => {
                let line = String::from_utf8_lossy(&bytes);
                for raw in line.lines() {
                    if let Some((k, v)) = raw.split_once('=') {
                        let v = v.trim();
                        match k.trim() {
                            "fps" => cur_fps = v.parse::<f64>().ok(),
                            "speed" => {
                                cur_speed = v.trim_end_matches('x').trim().parse::<f64>().ok()
                            }
                            "out_time_us" => {
                                if let Ok(us) = v.parse::<i64>() {
                                    let seconds = us as f64 / 1_000_000.0;
                                    let percent = if total_duration > 0.0 {
                                        (seconds / total_duration * 100.0).clamp(0.0, 100.0)
                                    } else {
                                        0.0
                                    };
                                    let eta_seconds = match cur_speed {
                                        Some(sp) if sp > 0.0 => {
                                            Some(((total_duration - seconds) / sp).max(0.0))
                                        }
                                        _ => None,
                                    };
                                    let _ = app.emit(
                                        "job-progress",
                                        ProgressPayload {
                                            job_id: job_id.clone(),
                                            percent,
                                            speed: cur_speed,
                                            fps: cur_fps,
                                            eta_seconds,
                                        },
                                    );
                                }
                            }
                            "progress" => {
                                if v == "end" {
                                    finished_ok = true;
                                }
                            }
                            _ => {}
                        }
                    }
                }
            }
            CommandEvent::Stderr(bytes) => {
                let line = String::from_utf8_lossy(&bytes).trim().to_string();
                if !line.is_empty() {
                    emit_log(app, state, "debug", format!("[{}] {}", job_id, line));
                    stderr_tail.push(line);
                    if stderr_tail.len() > 25 {
                        stderr_tail.remove(0);
                    }
                }
            }
            CommandEvent::Terminated(payload) => {
                let success = payload.code == Some(0);
                let was_canceled = {
                    let mut canceled = state.canceled.lock().map_err(|e| e.to_string())?;
                    canceled.remove(&job_id)
                };
                {
                    let mut jobs = state.jobs.lock().map_err(|e| e.to_string())?;
                    jobs.remove(&job_id);
                }
                if was_canceled {
                    emit_log(app, state, "info", format!("Đã huỷ job {}", job_id));
                    return Ok(());
                }
                if success {
                    emit_log(app, state, "info", format!("Hoàn tất job {}", job_id));
                    let _ = app.emit(
                        "job-progress",
                        ProgressPayload {
                            job_id: job_id.clone(),
                            percent: 100.0,
                            speed: cur_speed,
                            fps: cur_fps,
                            eta_seconds: Some(0.0),
                        },
                    );
                    let _ = app.emit(
                        "job-done",
                        JobDonePayload {
                            job_id: job_id.clone(),
                            output_path: output_path.clone(),
                        },
                    );
                    let _ = finished_ok; // percent already forced to 100 above
                } else {
                    let message = if stderr_tail.is_empty() {
                        format!("ffmpeg thoát với mã lỗi {:?}", payload.code)
                    } else {
                        stderr_tail.join("\n")
                    };
                    emit_log(
                        app,
                        state,
                        "error",
                        format!("Lỗi job {}: {}", job_id, message),
                    );
                    let _ = app.emit(
                        "job-error",
                        JobErrorPayload {
                            job_id: job_id.clone(),
                            message,
                        },
                    );
                }
                return Ok(());
            }
            _ => {}
        }
    }

    Ok(())
}

pub async fn start_video_job(
    app: AppHandle,
    state: tauri::State<'_, crate::state::AppState>,
    job_id: String,
    input: String,
    subtitle: Option<String>,
    output: String,
    options: VideoJobOptions,
) -> Result<(), String> {
    let info = probe_media(&app, &input).await?;

    let mut vf_parts = build_transform_chain(&options);

    if options.subtitle_mode == "hard" {
        if let Some(sub) = &subtitle {
            let fonts_dir = resolve_fonts_dir(&app);
            vf_parts.push(hardsub_style_filter(sub, &fonts_dir, &options));
        }
    }

    let speed_active = (options.speed - 1.0).abs() > f64::EPSILON;
    if speed_active {
        vf_parts.push(format!("setpts={:.6}*PTS", 1.0 / options.speed));
    }

    let quality = if options.compress {
        options.quality.clone()
    } else {
        preserve_quality_value(&options.encoder, &info)
    };

    let has_soft_sub = options.subtitle_mode == "soft" && subtitle.is_some();

    let mut args: Vec<String> = vec![
        "-y".into(),
        "-hide_banner".into(),
        "-i".into(),
        input.clone(),
    ];

    if has_soft_sub {
        args.push("-i".into());
        args.push(subtitle.clone().unwrap());
    }

    if !vf_parts.is_empty() {
        args.push("-vf".into());
        args.push(vf_parts.join(","));
    }

    if has_soft_sub {
        args.push("-map".into());
        args.push("0:v:0".into());
        if !options.mute_audio && info.has_audio {
            args.push("-map".into());
            args.push("0:a:0?".into());
        }
        args.push("-map".into());
        args.push("1:s:0".into());
    }

    args.extend(encoder_args(&options.encoder, &quality));

    if options.mute_audio {
        args.push("-an".into());
    } else {
        if speed_active {
            let af = atempo_chain(options.speed).join(",");
            args.push("-af".into());
            args.push(af);
        }
        args.push("-c:a".into());
        args.push("aac".into());
        args.push("-b:a".into());
        args.push(options.audio_bitrate.clone());
    }

    if has_soft_sub {
        args.push("-c:s".into());
        args.push("mov_text".into());
        args.push("-metadata:s:s:0".into());
        args.push("language=vie".into());
    }

    args.push("-movflags".into());
    args.push("+faststart".into());
    args.push("-progress".into());
    args.push("pipe:1".into());
    args.push("-loglevel".into());
    args.push("warning".into());
    args.push("-nostats".into());
    args.push(output.clone());

    let output_duration = if speed_active {
        info.duration / options.speed
    } else {
        info.duration
    };

    run_ffmpeg_job(&app, &state, job_id, args, output, output_duration).await
}

pub async fn preview_video(
    app: AppHandle,
    input: String,
    subtitle: Option<String>,
    options: VideoJobOptions,
) -> Result<String, String> {
    let info = probe_media(&app, &input).await?;

    let mut vf_parts = build_transform_chain(&options);
    if options.subtitle_mode == "hard" {
        if let Some(sub) = &subtitle {
            let fonts_dir = resolve_fonts_dir(&app);
            vf_parts.push(hardsub_style_filter(sub, &fonts_dir, &options));
        }
    }

    let seek = if info.duration > 2.0 {
        (info.duration * 0.15).max(1.0)
    } else {
        (info.duration / 2.0).max(0.0)
    };

    // Write the preview frame to a temp file instead of piping it through
    // stdout: tauri-plugin-shell's `.output()` reconstructs stdout from its
    // line-event stream, which corrupts arbitrary binary data by doubling
    // every 0x0A byte it finds. Reading the finished file from disk
    // sidesteps that entirely.
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let out_path = std::env::temp_dir().join(format!("kutils_preview_{}.png", nanos));
    let out_path_str = out_path.to_string_lossy().to_string();

    let mut args: Vec<String> = vec![
        "-y".into(),
        "-hide_banner".into(),
        "-ss".into(),
        format!("{:.3}", seek),
        "-i".into(),
        input,
    ];
    if !vf_parts.is_empty() {
        args.push("-vf".into());
        args.push(vf_parts.join(","));
    }
    args.push("-frames:v".into());
    args.push("1".into());
    args.push("-loglevel".into());
    args.push("error".into());
    args.push(out_path_str);

    let sidecar = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| e.to_string())?
        .args(args);

    let output = sidecar.output().await.map_err(|e| e.to_string())?;
    if !output.status.success() {
        let _ = std::fs::remove_file(&out_path);
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let bytes = std::fs::read(&out_path).map_err(|e| e.to_string())?;
    let _ = std::fs::remove_file(&out_path);
    if bytes.is_empty() {
        return Err("Không tạo được ảnh xem trước (file rỗng)".to_string());
    }

    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:image/png;base64,{}", b64))
}

pub fn cancel_job(
    state: &tauri::State<'_, crate::state::AppState>,
    job_id: &str,
) -> Result<(), String> {
    let mut jobs = state.jobs.lock().map_err(|e| e.to_string())?;
    if let Some(child) = jobs.remove(job_id) {
        {
            let mut canceled = state.canceled.lock().map_err(|e| e.to_string())?;
            canceled.insert(job_id.to_string());
        }
        child.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}
