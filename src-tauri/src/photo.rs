use base64::Engine;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

/// A single photo "look": every field is an independently adjustable slider
/// on the frontend. Built-in presets are just named starting points — the
/// user can nudge any slider afterward, and a Lightroom .xmp preset is
/// parsed into this same shape (best-effort, see `parse_lightroom_preset`).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhotoFilterParams {
    /// -100 (cool/blue) .. 100 (warm/orange)
    pub temperature: f64,
    /// -100 (green) .. 100 (magenta)
    pub tint: f64,
    pub exposure: f64,
    pub contrast: f64,
    pub highlights: f64,
    pub shadows: f64,
    pub whites: f64,
    pub blacks: f64,
    pub vibrance: f64,
    pub saturation: f64,
    /// 0..360 degrees
    pub split_shadow_hue: f64,
    /// 0..100
    pub split_shadow_sat: f64,
    pub split_highlight_hue: f64,
    pub split_highlight_sat: f64,
    /// -100 (favor shadows) .. 100 (favor highlights)
    pub split_balance: f64,
    /// 0..100 film grain amount
    pub grain: f64,
    /// 0..100 vignette darkening amount
    pub vignette: f64,
    /// 0..100 matte/faded-black amount
    pub fade: f64,
    /// 0..100 overall blend of the graded look against the original
    pub intensity: f64,
}

impl Default for PhotoFilterParams {
    fn default() -> Self {
        Self {
            temperature: 0.0,
            tint: 0.0,
            exposure: 0.0,
            contrast: 0.0,
            highlights: 0.0,
            shadows: 0.0,
            whites: 0.0,
            blacks: 0.0,
            vibrance: 0.0,
            saturation: 0.0,
            split_shadow_hue: 220.0,
            split_shadow_sat: 0.0,
            split_highlight_hue: 40.0,
            split_highlight_sat: 0.0,
            split_balance: 0.0,
            grain: 0.0,
            vignette: 0.0,
            fade: 0.0,
            intensity: 100.0,
        }
    }
}

#[derive(Clone, Serialize)]
pub struct PhotoPreset {
    pub id: String,
    pub name: String,
    pub category: String,
    pub params: PhotoFilterParams,
}

macro_rules! preset {
    ($id:expr, $name:expr, $cat:expr, temp=$temp:expr, tint=$tint:expr, exp=$exp:expr, con=$con:expr,
     hi=$hi:expr, sh=$sh:expr, wh=$wh:expr, bl=$bl:expr, vib=$vib:expr, sat=$sat:expr,
     ssh=$ssh:expr, sss=$sss:expr, shh=$shh:expr, shs=$shs:expr, sbal=$sbal:expr,
     grain=$grain:expr, vig=$vig:expr, fade=$fade:expr) => {
        PhotoPreset {
            id: $id.to_string(),
            name: $name.to_string(),
            category: $cat.to_string(),
            params: PhotoFilterParams {
                temperature: $temp,
                tint: $tint,
                exposure: $exp,
                contrast: $con,
                highlights: $hi,
                shadows: $sh,
                whites: $wh,
                blacks: $bl,
                vibrance: $vib,
                saturation: $sat,
                split_shadow_hue: $ssh,
                split_shadow_sat: $sss,
                split_highlight_hue: $shh,
                split_highlight_sat: $shs,
                split_balance: $sbal,
                grain: $grain,
                vignette: $vig,
                fade: $fade,
                intensity: 100.0,
            },
        }
    };
}

/// ~40 handcrafted looks across 8 trending categories. Each is a distinct,
/// deliberately-chosen combination (not a procedural sweep), so none of them
/// look like a re-skin of another.
pub fn built_in_presets() -> Vec<PhotoPreset> {
    vec![
        // Phim nhựa (film stocks)
        preset!("film_portra", "Kodak Portra 400", "Phim nhựa", temp = 12.0, tint = 2.0, exp = 2.0, con = 8.0, hi = -10.0, sh = 15.0, wh = -5.0, bl = 8.0, vib = 15.0, sat = -5.0, ssh = 210.0, sss = 10.0, shh = 40.0, shs = 15.0, sbal = -10.0, grain = 22.0, vig = 15.0, fade = 10.0),
        preset!("film_superia", "Fuji Superia", "Phim nhựa", temp = -5.0, tint = 3.0, exp = 1.0, con = 5.0, hi = -5.0, sh = 10.0, wh = 0.0, bl = 5.0, vib = 10.0, sat = 8.0, ssh = 160.0, sss = 8.0, shh = 50.0, shs = 10.0, sbal = 0.0, grain = 18.0, vig = 10.0, fade = 5.0),
        preset!("film_kodachrome", "Kodachrome 64", "Phim nhựa", temp = 8.0, tint = -4.0, exp = 0.0, con = 18.0, hi = -8.0, sh = 5.0, wh = 5.0, bl = -5.0, vib = 25.0, sat = 12.0, ssh = 230.0, sss = 12.0, shh = 35.0, shs = 18.0, sbal = -15.0, grain = 15.0, vig = 20.0, fade = 0.0),
        preset!("film_cinestill", "CineStill 800T", "Phim nhựa", temp = -20.0, tint = 6.0, exp = 3.0, con = 10.0, hi = -15.0, sh = 8.0, wh = 0.0, bl = 5.0, vib = 10.0, sat = 0.0, ssh = 350.0, sss = 15.0, shh = 20.0, shs = 20.0, sbal = 10.0, grain = 25.0, vig = 25.0, fade = 5.0),
        preset!("film_agfa", "Agfa Vista ấm", "Phim nhựa", temp = 15.0, tint = 1.0, exp = 2.0, con = 6.0, hi = -6.0, sh = 12.0, wh = -3.0, bl = 10.0, vib = 18.0, sat = 5.0, ssh = 25.0, sss = 10.0, shh = 45.0, shs = 12.0, sbal = -5.0, grain = 20.0, vig = 12.0, fade = 8.0),
        preset!("film_lomo", "Lomo Cross-process", "Phim nhựa", temp = 5.0, tint = -10.0, exp = 0.0, con = 25.0, hi = -20.0, sh = -10.0, wh = 15.0, bl = -15.0, vib = 30.0, sat = 20.0, ssh = 150.0, sss = 25.0, shh = 55.0, shs = 30.0, sbal = 0.0, grain = 30.0, vig = 35.0, fade = 0.0),
        // Vintage
        preset!("vin_polaroid", "Polaroid phai màu", "Vintage", temp = 10.0, tint = 2.0, exp = 5.0, con = -15.0, hi = -5.0, sh = 20.0, wh = -15.0, bl = 25.0, vib = -10.0, sat = -15.0, ssh = 40.0, sss = 15.0, shh = 45.0, shs = 10.0, sbal = 0.0, grain = 20.0, vig = 20.0, fade = 45.0),
        preset!("vin_sunbleached", "Nắng phai thập niên 70", "Vintage", temp = 20.0, tint = -3.0, exp = 8.0, con = -10.0, hi = -10.0, sh = 15.0, wh = -10.0, bl = 18.0, vib = -5.0, sat = -10.0, ssh = 35.0, sss = 20.0, shh = 50.0, shs = 15.0, sbal = -10.0, grain = 15.0, vig = 25.0, fade = 35.0),
        preset!("vin_dustyrose", "Dusty Rose", "Vintage", temp = 8.0, tint = 10.0, exp = 3.0, con = -8.0, hi = -5.0, sh = 10.0, wh = -8.0, bl = 15.0, vib = -8.0, sat = -5.0, ssh = 330.0, sss = 15.0, shh = 20.0, shs = 12.0, sbal = 5.0, grain = 12.0, vig = 15.0, fade = 30.0),
        preset!("vin_memory", "Ký ức Kodachrome", "Vintage", temp = 12.0, tint = 0.0, exp = 0.0, con = -5.0, hi = -12.0, sh = 8.0, wh = -5.0, bl = 10.0, vib = 5.0, sat = -8.0, ssh = 210.0, sss = 10.0, shh = 40.0, shs = 15.0, sbal = -5.0, grain = 18.0, vig = 18.0, fade = 25.0),
        preset!("vin_attic", "Gác mái bà ngoại", "Vintage", temp = 18.0, tint = 5.0, exp = 4.0, con = -20.0, hi = -8.0, sh = 25.0, wh = -20.0, bl = 30.0, vib = -15.0, sat = -20.0, ssh = 45.0, sss = 20.0, shh = 50.0, shs = 18.0, sbal = 0.0, grain = 25.0, vig = 30.0, fade = 50.0),
        preset!("vin_denim", "Denim bạc màu", "Vintage", temp = -8.0, tint = 8.0, exp = 2.0, con = -10.0, hi = -5.0, sh = 10.0, wh = -10.0, bl = 15.0, vib = -5.0, sat = -12.0, ssh = 210.0, sss = 18.0, shh = 200.0, shs = 10.0, sbal = -20.0, grain = 10.0, vig = 15.0, fade = 35.0),
        // Cổ điển (classic / retro)
        preset!("cla_sepia", "Sepia cổ điển", "Cổ điển", temp = 30.0, tint = 5.0, exp = 0.0, con = 5.0, hi = -5.0, sh = 10.0, wh = 0.0, bl = 5.0, vib = -40.0, sat = -45.0, ssh = 35.0, sss = 30.0, shh = 40.0, shs = 25.0, sbal = 0.0, grain = 10.0, vig = 25.0, fade = 10.0),
        preset!("cla_daguerreotype", "Daguerreotype", "Cổ điển", temp = 10.0, tint = 0.0, exp = -5.0, con = 15.0, hi = -10.0, sh = 5.0, wh = -5.0, bl = 10.0, vib = -50.0, sat = -55.0, ssh = 220.0, sss = 10.0, shh = 40.0, shs = 10.0, sbal = 0.0, grain = 20.0, vig = 35.0, fade = 5.0),
        preset!("cla_hollywood", "Old Hollywood", "Cổ điển", temp = 5.0, tint = -2.0, exp = 3.0, con = 12.0, hi = -8.0, sh = 6.0, wh = 5.0, bl = -5.0, vib = -20.0, sat = -25.0, ssh = 215.0, sss = 8.0, shh = 45.0, shs = 10.0, sbal = 0.0, grain = 15.0, vig = 30.0, fade = 0.0),
        preset!("cla_teastain", "Giấy nhuộm trà", "Cổ điển", temp = 25.0, tint = 8.0, exp = 2.0, con = -5.0, hi = -5.0, sh = 15.0, wh = -15.0, bl = 20.0, vib = -30.0, sat = -35.0, ssh = 40.0, sss = 25.0, shh = 42.0, shs = 20.0, sbal = 10.0, grain = 12.0, vig = 20.0, fade = 25.0),
        preset!("cla_antique", "Chân dung cổ", "Cổ điển", temp = 15.0, tint = 0.0, exp = 0.0, con = 10.0, hi = -10.0, sh = 10.0, wh = -5.0, bl = 8.0, vib = -35.0, sat = -40.0, ssh = 230.0, sss = 8.0, shh = 38.0, shs = 12.0, sbal = -5.0, grain = 18.0, vig = 28.0, fade = 12.0),
        // Đen trắng
        preset!("bw_trix", "Tri-X tương phản cao", "Đen trắng", temp = 0.0, tint = 0.0, exp = 0.0, con = 30.0, hi = -15.0, sh = 10.0, wh = 10.0, bl = -10.0, vib = 0.0, sat = -100.0, ssh = 220.0, sss = 0.0, shh = 40.0, shs = 0.0, sbal = 0.0, grain = 30.0, vig = 20.0, fade = 0.0),
        preset!("bw_ilford", "Ilford mềm mại", "Đen trắng", temp = 0.0, tint = 0.0, exp = 0.0, con = -10.0, hi = -5.0, sh = 15.0, wh = -5.0, bl = 15.0, vib = 0.0, sat = -100.0, ssh = 220.0, sss = 0.0, shh = 40.0, shs = 0.0, sbal = 0.0, grain = 15.0, vig = 10.0, fade = 15.0),
        preset!("bw_noir", "Noir kịch tính", "Đen trắng", temp = 0.0, tint = 0.0, exp = 0.0, con = 35.0, hi = -25.0, sh = 5.0, wh = 15.0, bl = -20.0, vib = 0.0, sat = -100.0, ssh = 220.0, sss = 0.0, shh = 40.0, shs = 0.0, sbal = 0.0, grain = 25.0, vig = 40.0, fade = 0.0),
        preset!("bw_silver", "Silver Gelatin", "Đen trắng", temp = 0.0, tint = 0.0, exp = 0.0, con = 15.0, hi = -10.0, sh = 10.0, wh = 5.0, bl = 0.0, vib = 0.0, sat = -100.0, ssh = 220.0, sss = 0.0, shh = 40.0, shs = 0.0, sbal = 0.0, grain = 20.0, vig = 15.0, fade = 5.0),
        preset!("bw_soft", "Ánh sáng dịu", "Đen trắng", temp = 0.0, tint = 0.0, exp = 0.0, con = -5.0, hi = 0.0, sh = 20.0, wh = -10.0, bl = 20.0, vib = 0.0, sat = -100.0, ssh = 220.0, sss = 0.0, shh = 40.0, shs = 0.0, sbal = 0.0, grain = 10.0, vig = 5.0, fade = 20.0),
        preset!("bw_street", "Phóng sự đường phố", "Đen trắng", temp = 0.0, tint = 0.0, exp = 0.0, con = 20.0, hi = -10.0, sh = 0.0, wh = 8.0, bl = -5.0, vib = 0.0, sat = -100.0, ssh = 220.0, sss = 0.0, shh = 40.0, shs = 0.0, sbal = 0.0, grain = 35.0, vig = 25.0, fade = 0.0),
        // Cinematic
        preset!("cin_tealorange", "Teal & Orange", "Cinematic", temp = 5.0, tint = -3.0, exp = 0.0, con = 15.0, hi = -10.0, sh = 5.0, wh = 0.0, bl = -5.0, vib = 20.0, sat = 5.0, ssh = 195.0, sss = 35.0, shh = 30.0, shs = 35.0, sbal = 0.0, grain = 10.0, vig = 20.0, fade = 5.0),
        preset!("cin_blockbuster", "Bom tấn tối màu", "Cinematic", temp = -5.0, tint = 0.0, exp = -8.0, con = 20.0, hi = -15.0, sh = -10.0, wh = 5.0, bl = -15.0, vib = 10.0, sat = -10.0, ssh = 210.0, sss = 25.0, shh = 25.0, shs = 15.0, sbal = -10.0, grain = 15.0, vig = 35.0, fade = 0.0),
        preset!("cin_thriller", "Moody Thriller", "Cinematic", temp = -10.0, tint = -5.0, exp = -10.0, con = 25.0, hi = -20.0, sh = -15.0, wh = 10.0, bl = -20.0, vib = -5.0, sat = -15.0, ssh = 230.0, sss = 30.0, shh = 15.0, shs = 10.0, sbal = -15.0, grain = 20.0, vig = 40.0, fade = 0.0),
        preset!("cin_scifi", "Sci-fi lạnh", "Cinematic", temp = -25.0, tint = -8.0, exp = -3.0, con = 18.0, hi = -5.0, sh = -5.0, wh = 8.0, bl = -10.0, vib = 5.0, sat = -5.0, ssh = 200.0, sss = 40.0, shh = 190.0, shs = 15.0, sbal = 0.0, grain = 12.0, vig = 25.0, fade = 0.0),
        preset!("cin_french", "Lãng mạn Pháp", "Cinematic", temp = 8.0, tint = 0.0, exp = 5.0, con = -5.0, hi = -10.0, sh = 10.0, wh = -5.0, bl = 5.0, vib = 15.0, sat = 0.0, ssh = 25.0, sss = 15.0, shh = 45.0, shs = 20.0, sbal = 10.0, grain = 10.0, vig = 15.0, fade = 15.0),
        // Pastel / Matte
        preset!("pas_matte", "Matte Fade", "Pastel / Matte", temp = 0.0, tint = 0.0, exp = 5.0, con = -20.0, hi = -10.0, sh = 15.0, wh = -20.0, bl = 25.0, vib = -5.0, sat = -10.0, ssh = 220.0, sss = 0.0, shh = 40.0, shs = 0.0, sbal = 0.0, grain = 5.0, vig = 5.0, fade = 50.0),
        preset!("pas_dreamy", "Pastel Dreamy", "Pastel / Matte", temp = 5.0, tint = 5.0, exp = 10.0, con = -15.0, hi = -5.0, sh = 10.0, wh = -15.0, bl = 15.0, vib = -10.0, sat = -20.0, ssh = 300.0, sss = 15.0, shh = 50.0, shs = 15.0, sbal = 0.0, grain = 5.0, vig = 5.0, fade = 40.0),
        preset!("pas_soft_portrait", "Soft Portrait", "Pastel / Matte", temp = 3.0, tint = 2.0, exp = 6.0, con = -10.0, hi = -8.0, sh = 8.0, wh = -10.0, bl = 10.0, vib = 5.0, sat = -8.0, ssh = 220.0, sss = 0.0, shh = 40.0, shs = 0.0, sbal = 0.0, grain = 3.0, vig = 8.0, fade = 30.0),
        preset!("pas_mint", "Mint Matte", "Pastel / Matte", temp = -10.0, tint = 5.0, exp = 5.0, con = -15.0, hi = -5.0, sh = 10.0, wh = -15.0, bl = 20.0, vib = -5.0, sat = -15.0, ssh = 160.0, sss = 15.0, shh = 50.0, shs = 10.0, sbal = 0.0, grain = 5.0, vig = 5.0, fade = 45.0),
        // Golden hour
        preset!("gh_sunset", "Hoàng hôn vàng", "Golden hour", temp = 30.0, tint = -2.0, exp = 5.0, con = 8.0, hi = -5.0, sh = 5.0, wh = 0.0, bl = 0.0, vib = 20.0, sat = 10.0, ssh = 230.0, sss = 10.0, shh = 35.0, shs = 30.0, sbal = 15.0, grain = 8.0, vig = 15.0, fade = 5.0),
        preset!("gh_afternoon", "Nắng chiều ấm", "Golden hour", temp = 25.0, tint = 0.0, exp = 8.0, con = 5.0, hi = -10.0, sh = 8.0, wh = -3.0, bl = 3.0, vib = 15.0, sat = 5.0, ssh = 220.0, sss = 8.0, shh = 40.0, shs = 25.0, sbal = 10.0, grain = 5.0, vig = 10.0, fade = 10.0),
        preset!("gh_beach", "Bãi biển hoàng hôn", "Golden hour", temp = 20.0, tint = -5.0, exp = 3.0, con = 10.0, hi = -8.0, sh = 5.0, wh = 0.0, bl = 0.0, vib = 25.0, sat = 12.0, ssh = 200.0, sss = 15.0, shh = 25.0, shs = 35.0, sbal = 5.0, grain = 8.0, vig = 20.0, fade = 0.0),
        // Trendy khác
        preset!("tr_vsco", "VSCO Faded", "Trendy khác", temp = 5.0, tint = 3.0, exp = 5.0, con = -10.0, hi = -5.0, sh = 15.0, wh = -10.0, bl = 15.0, vib = -5.0, sat = -10.0, ssh = 220.0, sss = 0.0, shh = 40.0, shs = 0.0, sbal = 0.0, grain = 10.0, vig = 10.0, fade = 25.0),
        preset!("tr_clarendon", "Clarendon rực rỡ", "Trendy khác", temp = 0.0, tint = 0.0, exp = 5.0, con = 15.0, hi = -5.0, sh = 10.0, wh = 5.0, bl = -5.0, vib = 20.0, sat = 15.0, ssh = 220.0, sss = 0.0, shh = 40.0, shs = 0.0, sbal = 0.0, grain = 0.0, vig = 10.0, fade = 0.0),
        preset!("tr_y2k", "Y2K Flash", "Trendy khác", temp = -5.0, tint = 8.0, exp = 15.0, con = 10.0, hi = -15.0, sh = 0.0, wh = 10.0, bl = -5.0, vib = 10.0, sat = 5.0, ssh = 220.0, sss = 0.0, shh = 40.0, shs = 0.0, sbal = 0.0, grain = 15.0, vig = 30.0, fade = 0.0),
        preset!("tr_dreamcore", "Dreamcore", "Trendy khác", temp = 10.0, tint = 15.0, exp = 10.0, con = -15.0, hi = -10.0, sh = 20.0, wh = -20.0, bl = 20.0, vib = -10.0, sat = -15.0, ssh = 280.0, sss = 20.0, shh = 50.0, shs = 20.0, sbal = 0.0, grain = 8.0, vig = 10.0, fade = 35.0),
        preset!("tr_cyberpunk", "Cyberpunk Neon", "Trendy khác", temp = -15.0, tint = 10.0, exp = 0.0, con = 25.0, hi = -10.0, sh = -10.0, wh = 10.0, bl = -15.0, vib = 30.0, sat = 20.0, ssh = 270.0, sss = 40.0, shh = 320.0, shs = 35.0, sbal = 0.0, grain = 10.0, vig = 25.0, fade = 0.0),
    ]
}

fn clamp01(v: f64) -> f64 {
    v.clamp(0.0, 1.0)
}

/// HSV(hue, sat, v=1) relative to pure white -> a signed RGB tint that is
/// exactly (0,0,0) at sat=0 and grows a hue-colored deviation as saturation
/// increases (subtracting a fixed 0.5 instead of `v` would leak a uniform
/// brightness shift into shadows/highlights even at zero saturation, which
/// an earlier version of this function did).
fn hsv_to_rgb_delta(hue_deg: f64, sat_pct: f64) -> (f64, f64, f64) {
    let h = hue_deg.rem_euclid(360.0) / 60.0;
    let s = (sat_pct / 100.0).clamp(0.0, 1.0);
    let i = (h.floor() as i32).rem_euclid(6);
    let f = h - h.floor();
    let v = 1.0;
    let p = v * (1.0 - s);
    let q = v * (1.0 - s * f);
    let t = v * (1.0 - s * (1.0 - f));
    let (r, g, b) = match i {
        0 => (v, t, p),
        1 => (q, v, p),
        2 => (p, v, t),
        3 => (p, q, v),
        4 => (t, p, v),
        _ => (v, p, q),
    };
    (r - v, g - v, b - v)
}

fn build_color_balance(params: &PhotoFilterParams) -> String {
    let warm = params.temperature / 100.0 * 0.4;
    let tint = params.tint / 100.0 * 0.4;

    let (sr, sg, sb) = hsv_to_rgb_delta(params.split_shadow_hue, params.split_shadow_sat);
    let (hr, hg, hb) = hsv_to_rgb_delta(params.split_highlight_hue, params.split_highlight_sat);

    let balance = params.split_balance / 100.0;
    let shadow_w = (1.0 - balance.max(0.0)).clamp(0.0, 1.0);
    let highlight_w = (1.0 + balance.min(0.0)).clamp(0.0, 1.0);
    let strength = 0.6;

    let rs = (warm + sr * strength * shadow_w).clamp(-1.0, 1.0);
    let gs = (-tint + sg * strength * shadow_w).clamp(-1.0, 1.0);
    let bs = (-warm + sb * strength * shadow_w).clamp(-1.0, 1.0);

    let rm = (warm * 0.6).clamp(-1.0, 1.0);
    let gm = (-tint * 0.6).clamp(-1.0, 1.0);
    let bm = (-warm * 0.6).clamp(-1.0, 1.0);

    let rh = (warm + hr * strength * highlight_w).clamp(-1.0, 1.0);
    let gh = (-tint + hg * strength * highlight_w).clamp(-1.0, 1.0);
    let bh = (-warm + hb * strength * highlight_w).clamp(-1.0, 1.0);

    format!(
        "colorbalance=rs={rs:.4}:gs={gs:.4}:bs={bs:.4}:rm={rm:.4}:gm={gm:.4}:bm={bm:.4}:rh={rh:.4}:gh={gh:.4}:bh={bh:.4}"
    )
}

fn build_eq(params: &PhotoFilterParams) -> String {
    let brightness = (params.exposure / 100.0 * 0.25).clamp(-1.0, 1.0);
    let contrast = (1.0 + params.contrast / 100.0 * 0.5).clamp(0.1, 3.0);
    let saturation =
        (1.0 + (params.saturation + params.vibrance * 0.6) / 100.0).clamp(0.0, 3.0);
    format!("eq=brightness={brightness:.4}:contrast={contrast:.4}:saturation={saturation:.4}")
}

fn build_curves(params: &PhotoFilterParams) -> Option<String> {
    if params.highlights == 0.0
        && params.shadows == 0.0
        && params.whites == 0.0
        && params.blacks == 0.0
        && params.fade == 0.0
    {
        return None;
    }
    let black_y = clamp01(params.blacks / 100.0 * 0.1 + params.fade / 100.0 * 0.13);
    let shadow_y = clamp01(0.25 + params.shadows / 100.0 * 0.12);
    let highlight_y = clamp01(0.75 + params.highlights / 100.0 * 0.12);
    let white_y =
        clamp01(1.0 + params.whites / 100.0 * 0.08 - params.fade / 100.0 * 0.05).max(black_y + 0.3);
    Some(format!(
        "curves=master='0/{black_y:.4} 0.25/{shadow_y:.4} 0.5/0.5 0.75/{highlight_y:.4} 1/{white_y:.4}'"
    ))
}

fn build_vignette(amount: f64) -> Option<String> {
    if amount <= 0.0 {
        return None;
    }
    let t = (amount / 100.0).clamp(0.0, 1.0);
    let angle = std::f64::consts::PI / (2.2 + t * 7.5);
    Some(format!("vignette=angle={angle:.5}:mode=forward"))
}

fn build_noise(amount: f64) -> Option<String> {
    if amount <= 0.0 {
        return None;
    }
    let strength = (amount / 100.0 * 55.0).clamp(0.0, 90.0) as i32;
    Some(format!("noise=alls={strength}:allf=t+u"))
}

/// The grading-only filter steps (white balance, tone curve, grain,
/// vignette) in application order, with no scale/blend wrapping around
/// them. Shared by the photo export path above and the video job pipeline's
/// optional "Chỉnh màu" stage (see `ffmpeg.rs`).
pub fn grading_filter_chain(params: &PhotoFilterParams) -> Vec<String> {
    let mut chain: Vec<String> = Vec::new();
    chain.push(build_color_balance(params));
    chain.push(build_eq(params));
    if let Some(c) = build_curves(params) {
        chain.push(c);
    }
    if let Some(n) = build_noise(params.grain) {
        chain.push(n);
    }
    if let Some(v) = build_vignette(params.vignette) {
        chain.push(v);
    }
    chain
}

/// Scales every magnitude-style field by `intensity/100` (hue fields, which
/// are a rotation rather than a magnitude, and `intensity` itself are left
/// alone) and returns a full-strength copy. The video pipeline uses this
/// instead of photo export's split+blend trick: video jobs build a single
/// plain `-vf` chain (no `-filter_complex`), which keeps the existing
/// subtitle/audio `-map` logic untouched.
pub fn scale_params_by_intensity(params: &PhotoFilterParams) -> PhotoFilterParams {
    let f = (params.intensity / 100.0).clamp(0.0, 1.0);
    PhotoFilterParams {
        temperature: params.temperature * f,
        tint: params.tint * f,
        exposure: params.exposure * f,
        contrast: params.contrast * f,
        highlights: params.highlights * f,
        shadows: params.shadows * f,
        whites: params.whites * f,
        blacks: params.blacks * f,
        vibrance: params.vibrance * f,
        saturation: params.saturation * f,
        split_shadow_hue: params.split_shadow_hue,
        split_shadow_sat: params.split_shadow_sat * f,
        split_highlight_hue: params.split_highlight_hue,
        split_highlight_sat: params.split_highlight_sat * f,
        split_balance: params.split_balance,
        grain: params.grain * f,
        vignette: params.vignette * f,
        fade: params.fade * f,
        intensity: 100.0,
    }
}

/// Builds the ffmpeg argument fragment (either `-vf <chain>` or
/// `-filter_complex ... -map [outv]`) for one photo. `max_width` downsizes
/// the frame first (used for the fast before/after preview); pass `None` to
/// render at full source resolution (used for the real export).
fn build_photo_filter(params: &PhotoFilterParams, max_width: Option<u32>) -> Vec<String> {
    let grading = grading_filter_chain(params).join(",");

    let scale_filter = max_width.map(|w| format!("scale='min(iw,{w})':-2"));

    if params.intensity >= 99.5 {
        let mut full_chain = Vec::new();
        if let Some(s) = &scale_filter {
            full_chain.push(s.clone());
        }
        full_chain.push(grading);
        vec!["-vf".into(), full_chain.join(",")]
    } else {
        let opacity = (params.intensity / 100.0).clamp(0.0, 1.0);
        let pre = scale_filter.map(|s| format!("{s},")).unwrap_or_default();
        let fc = format!(
            "[0:v]{pre}split=2[orig][src];[src]{grading}[graded];[graded][orig]blend=all_mode=normal:all_opacity={opacity:.4}[outv]"
        );
        vec![
            "-filter_complex".into(),
            fc,
            "-map".into(),
            "[outv]".into(),
        ]
    }
}

fn now_nanos() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0)
}

/// ffmpeg's static build has no HEIC/HEIF decoder. macOS ships `sips` on
/// every machine, so HEIC input is converted to a temp PNG with it first;
/// everything else passes through untouched. Returns the path ffmpeg should
/// read and, if a temp file was created, its path for later cleanup.
async fn ensure_decodable(path: &str) -> Result<(String, Option<std::path::PathBuf>), String> {
    let ext = std::path::Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    if ext != "heic" && ext != "heif" {
        return Ok((path.to_string(), None));
    }

    let tmp = std::env::temp_dir().join(format!("kutils_heic_{}.png", now_nanos()));
    let tmp_str = tmp.to_string_lossy().to_string();

    let output = std::process::Command::new("/usr/bin/sips")
        .args(["-s", "format", "png", path, "--out", &tmp_str])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(format!(
            "Không đọc được file HEIC: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    Ok((tmp_str, Some(tmp)))
}

pub async fn list_photo_presets() -> Vec<PhotoPreset> {
    built_in_presets()
}

pub async fn preview_photo(
    app: AppHandle,
    input: String,
    params: PhotoFilterParams,
) -> Result<String, String> {
    let (decodable_input, cleanup) = ensure_decodable(&input).await?;

    let out_path = std::env::temp_dir().join(format!("kutils_photo_preview_{}.png", now_nanos()));
    let out_str = out_path.to_string_lossy().to_string();

    let mut args: Vec<String> = vec![
        "-y".into(),
        "-hide_banner".into(),
        "-i".into(),
        decodable_input,
    ];
    args.extend(build_photo_filter(&params, Some(1280)));
    args.push("-frames:v".into());
    args.push("1".into());
    args.push("-loglevel".into());
    args.push("error".into());
    args.push(out_str.clone());

    let sidecar = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| e.to_string())?
        .args(args);
    let output = sidecar.output().await.map_err(|e| e.to_string())?;

    if let Some(tmp) = &cleanup {
        let _ = std::fs::remove_file(tmp);
    }

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

pub async fn apply_photo_job(
    app: AppHandle,
    input: String,
    output: String,
    params: PhotoFilterParams,
) -> Result<String, String> {
    let (decodable_input, cleanup) = ensure_decodable(&input).await?;

    let mut args: Vec<String> = vec![
        "-y".into(),
        "-hide_banner".into(),
        "-i".into(),
        decodable_input,
    ];
    args.extend(build_photo_filter(&params, None));

    let ext = std::path::Path::new(&output)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    if ext == "jpg" || ext == "jpeg" {
        args.push("-q:v".into());
        args.push("2".into());
    }
    args.push("-frames:v".into());
    args.push("1".into());
    args.push("-loglevel".into());
    args.push("warning".into());
    args.push(output.clone());

    let sidecar = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| e.to_string())?
        .args(args);
    let out = sidecar.output().await.map_err(|e| e.to_string())?;

    if let Some(tmp) = &cleanup {
        let _ = std::fs::remove_file(tmp);
    }

    if !out.status.success() {
        return Err(String::from_utf8_lossy(&out.stderr).to_string());
    }
    Ok(output)
}

fn extract_xmp_attr(xml: &str, name: &str) -> Option<f64> {
    let needle = format!("crs:{}=\"", name);
    let start = xml.find(&needle)? + needle.len();
    let end = xml[start..].find('"')? + start;
    xml[start..end].trim().parse::<f64>().ok()
}

/// Best-effort mapping of a Lightroom .xmp preset's scalar `crs:` fields
/// onto our own sliders. This is NOT a pixel-accurate reproduction — Adobe's
/// raw-processing pipeline is proprietary — but it gets the overall look
/// (white balance, tone, split-toning, grain, vignette) in the right
/// direction so the user can fine-tune from there.
pub async fn parse_lightroom_preset(path: String) -> Result<PhotoFilterParams, String> {
    let xml = std::fs::read_to_string(&path)
        .map_err(|e| format!("Không đọc được file preset: {}", e))?;

    let mut p = PhotoFilterParams::default();

    if let Some(k) = extract_xmp_attr(&xml, "Temperature") {
        p.temperature = (((k - 6500.0) / 6500.0) * 100.0).clamp(-100.0, 100.0);
    }
    if let Some(t) = extract_xmp_attr(&xml, "Tint") {
        p.tint = (t / 150.0 * 100.0).clamp(-100.0, 100.0);
    }
    if let Some(e) = extract_xmp_attr(&xml, "Exposure2012") {
        p.exposure = (e / 5.0 * 100.0).clamp(-100.0, 100.0);
    }
    if let Some(v) = extract_xmp_attr(&xml, "Contrast2012") {
        p.contrast = v.clamp(-100.0, 100.0);
    }
    if let Some(v) = extract_xmp_attr(&xml, "Highlights2012") {
        p.highlights = v.clamp(-100.0, 100.0);
    }
    if let Some(v) = extract_xmp_attr(&xml, "Shadows2012") {
        p.shadows = v.clamp(-100.0, 100.0);
    }
    if let Some(v) = extract_xmp_attr(&xml, "Whites2012") {
        p.whites = v.clamp(-100.0, 100.0);
    }
    if let Some(v) = extract_xmp_attr(&xml, "Blacks2012") {
        p.blacks = v.clamp(-100.0, 100.0);
    }
    if let Some(v) = extract_xmp_attr(&xml, "Vibrance") {
        p.vibrance = v.clamp(-100.0, 100.0);
    }
    if let Some(v) = extract_xmp_attr(&xml, "Saturation") {
        p.saturation = v.clamp(-100.0, 100.0);
    }
    if let Some(v) = extract_xmp_attr(&xml, "SplitToningShadowHue") {
        p.split_shadow_hue = v.clamp(0.0, 360.0);
    }
    if let Some(v) = extract_xmp_attr(&xml, "SplitToningShadowSaturation") {
        p.split_shadow_sat = v.clamp(0.0, 100.0);
    }
    if let Some(v) = extract_xmp_attr(&xml, "SplitToningHighlightHue") {
        p.split_highlight_hue = v.clamp(0.0, 360.0);
    }
    if let Some(v) = extract_xmp_attr(&xml, "SplitToningHighlightSaturation") {
        p.split_highlight_sat = v.clamp(0.0, 100.0);
    }
    if let Some(v) = extract_xmp_attr(&xml, "SplitToningBalance") {
        p.split_balance = v.clamp(-100.0, 100.0);
    }
    if let Some(v) = extract_xmp_attr(&xml, "GrainAmount") {
        p.grain = v.clamp(0.0, 100.0);
    }
    if let Some(v) = extract_xmp_attr(&xml, "PostCropVignetteAmount") {
        p.vignette = (-v).clamp(0.0, 100.0);
    }

    Ok(p)
}
