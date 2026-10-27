/// Converts one image file to a common format using macOS's built-in `sips`
/// tool, which (unlike our statically-linked ffmpeg) reads HEIC/HEIF, AVIF,
/// WebP and essentially every camera RAW format (CR2/CR3/NEF/ARW/DNG/RAF/
/// ORF/RW2/PEF/SRW...) natively via the system's ImageIO decoders — no extra
/// dependency needed. `quality` (0-100) only applies to formats that
/// actually compress (currently just JPEG); it's ignored otherwise.
pub async fn convert_image(input: String, output: String, quality: Option<u32>) -> Result<String, String> {
    let target_format = sips_format_for_output(&output)
        .ok_or_else(|| "Định dạng đích không được hỗ trợ".to_string())?;

    let mut args: Vec<String> = vec!["-s".into(), "format".into(), target_format.into()];
    if target_format == "jpeg" {
        if let Some(q) = quality {
            args.push("-s".into());
            args.push("formatOptions".into());
            args.push(q.clamp(1, 100).to_string());
        }
    }
    args.push(input);
    args.push("--out".into());
    args.push(output.clone());

    let out = std::process::Command::new("/usr/bin/sips")
        .args(&args)
        .output()
        .map_err(|e| e.to_string())?;

    if !out.status.success() {
        let stderr = String::from_utf8_lossy(&out.stderr);
        let stdout = String::from_utf8_lossy(&out.stdout);
        let message = if !stderr.trim().is_empty() {
            stderr.trim().to_string()
        } else {
            stdout.trim().to_string()
        };
        return Err(if message.is_empty() {
            "sips không chuyển đổi được file này".to_string()
        } else {
            message
        });
    }

    Ok(output)
}

fn sips_format_for_output(output: &str) -> Option<&'static str> {
    let ext = std::path::Path::new(output)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    match ext.as_str() {
        "jpg" | "jpeg" => Some("jpeg"),
        "png" => Some("png"),
        "tif" | "tiff" => Some("tiff"),
        "bmp" => Some("bmp"),
        "gif" => Some("gif"),
        "heic" => Some("heic"),
        "avif" => Some("avif"),
        _ => None,
    }
}
