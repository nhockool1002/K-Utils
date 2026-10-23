<p align="center">
  <img src="src-tauri/icons/128x128@2x.png" width="110" alt="K-Utils icon" />
</p>

<h1 align="center">K-Utils</h1>

<p align="center">
  Ứng dụng tiện ích xử lý video &amp; ảnh chạy hoàn toàn trên máy (macOS, Apple Silicon) —
  nén video, ghép phụ đề, xoay/crop/đổi tốc độ, và chỉnh màu ảnh với hơn 40 bộ lọc dựng sẵn.
  <br />
  Không cần tài khoản, không upload lên cloud, không phụ thuộc phần mềm ngoài.
</p>

<p align="center">
  <em>A native, offline-first macOS utility for batch video processing and photo color
  grading — built with Tauri + Rust + React.</em>
</p>

---

## Tính năng

### 🎬 Xử lý video

Một màn hình duy nhất, mọi tác vụ có thể **kết hợp tự do trong một lần render** (một lượt
re-encode, không mất chất lượng qua nhiều bước trung gian):

- **Ghép phụ đề**: phụ đề cứng (burn-in, SRT/VTT/ASS, hỗ trợ tiếng Việt có dấu, tuỳ chỉnh cỡ
  chữ/màu chữ/màu viền/vị trí) hoặc phụ đề mềm (nhúng track `mov_text`, bật/tắt khi phát).
- **Xoay / lật video**: 0°/90°/180°/270°, lật ngang, lật dọc.
- **Crop / đổi tỷ lệ khung hình**: 1:1, 9:16, 16:9, 4:3 (crop giữa khung hình).
- **Tua nhanh / tua chậm**: 0.25x–4x, tự đồng bộ audio (`atempo` theo chuỗi).
- **Nén video**: mã hoá phần cứng VideoToolbox (H.264/H.265) hoặc CPU (libx264/libx265), tuỳ
  chọn độ phân giải, mức chất lượng, bitrate audio, tắt tiếng.
- **Xem trước (preview)** trực tiếp trong modal trước khi chạy, cập nhật theo thời gian thực
  khi chỉnh thông số.
- **Hàng đợi xử lý tuần tự**, có tiến trình (%, fps, tốc độ, ETA), huỷ/thử lại từng job.

### 🖼️ Chỉnh ảnh

- **40 bộ lọc màu dựng sẵn**, chia 8 nhóm phong cách: Phim nhựa, Vintage, Cổ điển, Đen trắng,
  Cinematic, Pastel / Matte, Golden hour, Trendy khác.
- **Điều chỉnh chi tiết**: nhiệt độ màu, tint, phơi sáng, tương phản, highlights/shadows/
  whites/blacks, vibrance/saturation, chia tông màu (split-toning), hạt phim (grain),
  vignette, fade, cường độ tổng (blend giữa ảnh gốc và ảnh đã chỉnh).
- **So sánh trước/sau trực quan** bằng thanh kéo chia đôi ảnh.
- **Nạp preset Lightroom (`.xmp`)**: đọc các thông số phổ biến (nhiệt độ, exposure, contrast,
  split-toning, grain, vignette...) và map gần đúng (best-effort) sang bộ lọc của app — không
  đảm bảo giống 100% vì Lightroom dùng engine xử lý RAW độc quyền.
- **Xử lý hàng loạt**: chọn nhiều ảnh (JPG/PNG/HEIC), áp cùng một bộ lọc, xuất lần lượt.

### 🛠️ Khác

- **Nhật ký ứng dụng**: xem log 15 phút gần nhất, xoá log để debug.
- **Tối ưu hiệu năng**: ưu tiên mã hoá phần cứng (Apple Silicon VideoToolbox) để máy đỡ nóng,
  pin đỡ hao.
- Giao diện tiếng Việt, tối giản, không cần tài khoản hay kết nối mạng.

---

## Công nghệ sử dụng

| Lớp | Công nghệ |
| --- | --- |
| Shell ứng dụng | [Tauri 2](https://tauri.app/) (Rust) |
| Giao diện | React 19 + TypeScript + Vite + Tailwind CSS 4 |
| State management | Zustand |
| Xử lý video/ảnh | [FFmpeg](https://ffmpeg.org/) 8.0 build tĩnh (static), đóng gói sẵn trong app |

FFmpeg được build tĩnh từ source, liên kết với `libass`, `freetype`, `fribidi`, `harfbuzz`,
`fontconfig`, `x264`, `x265` và hỗ trợ mã hoá phần cứng VideoToolbox/AudioToolbox của Apple
Silicon — không cần người dùng cài ffmpeg hay bất kỳ phần mềm nào khác.

---

## Yêu cầu hệ thống

- macOS 11 (Big Sur) trở lên, **Apple Silicon (M1/M2/M3...)**.
- (Windows: dự kiến hỗ trợ ở bản sau.)

## Cài đặt (người dùng cuối)

1. Tải file `.dmg` mới nhất trong phần [Releases](https://github.com/nhockool1002/K-Utils/releases).
2. Mở file `.dmg`, kéo **K-Utils** vào thư mục `Applications`.
3. Lần đầu mở có thể cần vào **System Settings → Privacy & Security** để cho phép chạy (vì app
   chưa được ký bởi Apple Developer Program).

---

## Phát triển (development)

### Yêu cầu

- [Node.js](https://nodejs.org/) ≥ 18 và npm
- [Rust](https://www.rust-lang.org/tools/install) (bản ổn định mới nhất)
- Xcode Command Line Tools (`xcode-select --install`)

### Cài dependencies

```bash
npm install
```

### Chạy ở chế độ dev

```bash
npm run tauri dev
```

### Build bản release (.app + .dmg)

```bash
npm run tauri build -- --bundles app,dmg
```

Kết quả nằm trong `src-tauri/target/release/bundle/`.

### Build bản debug nhanh (chỉ .app, không ký/nén)

```bash
npm run tauri build -- --debug --bundles app
```

> **Lưu ý:** `src-tauri/binaries/` chứa sẵn các binary `ffmpeg`/`ffprobe` build tĩnh cho
> `aarch64-apple-darwin` cùng thư mục `ffmpeg-libs/` (các dylib phụ thuộc đã được vendor và
> rewrite rpath) — không cần tự build ffmpeg để chạy dev/build trên Apple Silicon.

---

## Cấu trúc dự án

```
K-Utils/
├─ src/                     # Frontend (React + TypeScript)
│  ├─ components/           # VideoPanel, PhotoPanel, QueueView, LogView, UI dùng chung...
│  ├─ lib/                  # Lớp gọi lệnh Tauri (api.ts, photoApi.ts), helpers
│  ├─ store/                # Zustand store (hàng đợi video, log)
│  └─ types.ts              # Kiểu dữ liệu dùng chung giữa FE/BE
├─ src-tauri/
│  ├─ src/
│  │  ├─ ffmpeg.rs           # Xây filter-graph & chạy job video (xoay/crop/speed/sub/nén)
│  │  ├─ photo.rs            # Xây filter-graph ảnh, preset màu, parser Lightroom .xmp
│  │  ├─ commands.rs         # Các lệnh Tauri expose ra frontend
│  │  └─ state.rs            # State dùng chung (job đang chạy, log, job bị huỷ)
│  ├─ binaries/              # ffmpeg/ffprobe build tĩnh + ffmpeg-libs/ (vendored dylibs)
│  ├─ icons/                 # Bộ icon ứng dụng (tạo bằng `tauri icon`)
│  └─ tauri.conf.json        # Cấu hình Tauri (bundle, cửa sổ, externalBin, resources)
└─ package.json
```

---

## Ghi chú kỹ thuật

- Mỗi job video là **một lệnh ffmpeg duy nhất**: xoay, lật, crop, đổi tốc độ, ghép phụ đề và
  nén được gộp chung vào một filter-graph thay vì chạy nhiều bước riêng lẻ — giữ chất lượng và
  nhanh hơn.
- Bộ lọc ảnh dùng `colorbalance`, `eq`, `curves`, `noise`, `vignette` của ffmpeg để mô phỏng
  nhiệt độ màu, tông, split-toning, grain và vignette; không phải thuật toán xử lý RAW như
  Lightroom/Camera Raw.
- Ảnh HEIC được chuyển sang PNG bằng `sips` (có sẵn trên mọi máy Mac) trước khi đưa vào ffmpeg,
  vì bản ffmpeg tĩnh đi kèm không có decoder HEIC.

---

## License

Dự án cá nhân, chưa gắn license công khai. Vui lòng liên hệ tác giả trước khi sử dụng lại mã
nguồn cho mục đích khác ngoài tham khảo.
