# 🗓️ Lịch Lập Kế Hoạch Hàng Ngày — Starnest Style Planner ✨

> Web App lập kế hoạch hàng ngày giao diện Kawaii Pastel (chuẩn phong cách Starnest Daily Planner), hỗ trợ dải ngày ngang 31 ngày, vòng tiến độ trực quan, checklist 1 chạm, theo dõi thói quen & cảm xúc, đổi 4 chủ đề và đồng bộ dữ liệu 2 chiều với Google Sheet & máy chủ NAS.

---

## 🌟 Tính Năng Nổi Bật

1. **Giao diện Pastel Kawaii chuẩn Starnest:**
   - 4 Bộ chủ đề đổi màu linh hoạt: **🎀 Hồng Pastel**, **🌙 Dark Kawaii**, **🌿 Xanh Bạc Hà**, **☕ Latte Kem**.
   - Dải ngày ngang thông minh (31 ngày của Tháng 10/2026), chuyển ngày mượt mà với 1 chạm.
   - Vòng tiến độ SVG cập nhật % thời gian thực kèm câu nói truyền cảm hứng.
   - Phân chia các buổi sinh hoạt khoa học: **🌅 Buổi Sáng**, **🌇 Buổi Chiều**, **🌙 Buổi Tối**.

2. **Checklist 1 Chạm Siêu Nhanh (Circular Checkbox):**
   - Đánh dấu hoàn thành việc tức thì với hiệu ứng gạch ngang và đổi trạng thái.
   - Nút nổi `+` thêm kế hoạch mới nhanh chóng với đầy đủ mức ưu tiên, giờ giấc, phân loại.

3. **Theo Dõi Thói Quen & Cảm Xúc (Habits & Mood):**
   - Bộ chọn biểu cảm hôm nay (5 sắc thái cảm xúc dễ thương).
   - Nhật ký uống 8 ly nước mỗi ngày, chuỗi thói quen đọc sách & thể thao.
   - Tab xem lịch cả tháng 31 ngày trực quan.

4. **Đồng Bộ Dữ Liệu 2 Chiều Google Sheet & Máy Chủ NAS:**
   - **Google Sheet:** Kết nối trực tiếp tab `CONG_VIEC_HANG_NGAY`.
   - **Cloud Serverless:** Hỗ trợ gọi trực tiếp qua Google Apps Script Web App API mà không cần mở máy tính cá nhân.
   - **Máy chủ NAS Kiểu Việt:** Sao lưu dự phòng an toàn về ổ đĩa NAS `K:\LUU TRU TAM\Lich_Lap_Ke_Hoach_KiêuViet`.

---

## 🚀 Hướng Dẫn Sử Dụng & Triển Khai

### 1. Trực tiếp trên GitHub Pages (Khuyên Dùng — Không Cần Server)
- Mở đường dẫn GitHub Pages: `https://bombeodeptrai.github.io/starnest-daily-planner/`
- Ứng dụng chạy mượt mà trên điện thoại di động (iOS / Android) và máy tính.

### 2. Kết Nối Google Apps Script Đồng Bộ Google Sheet
- Mở file [`google_apps_script.js`](./google_apps_script.js), sao chép nội dung vào **Google Sheet -> Extensions -> Apps Script**.
- Nhấn **Deploy -> New Deployment -> Web App** (Who has access: Anyone).
- Dán URL vào nút "Lưu về Google Sheet" trên Web App.

### 3. Chạy Với Backend Python / Docker Trên Máy Chủ NAS
- **Chạy trực tiếp Python:**
  ```bash
  pip install -r requirements.txt
  python server.py
  ```
- **Chạy bằng Docker / Container Manager trên NAS Synology:**
  ```bash
  docker compose up -d
  ```
  Truy cập cổng `http://<IP-NAS>:8089`.

### 4. Sao Lưu Về Ổ Đĩa NAS Kiểu Việt
- Chạy lệnh sao lưu toàn bộ code và dữ liệu:
  ```bash
  python nas_backup_sync.py
  ```
