import os
import shutil
import datetime
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
NAS_TARGET_DIR = r"K:\LUU TRU TAM\Lich_Lap_Ke_Hoach_KiêuViet"

def sync_to_nas():
    print(f"--- BẮT ĐẦU ĐỒNG BỘ DỰ PHÒNG VỀ MÁY CHỦ NAS ({NAS_TARGET_DIR}) ---")
    if not os.path.exists(r"K:\LUU TRU TAM"):
        print("⚠️ Ổ đĩa NAS K: không khả dụng hoặc chưa kết nối mạng!")
        return False

    os.makedirs(NAS_TARGET_DIR, exist_ok=True)

    files_to_sync = [
        "tasks_data.json",
        "CONG_VIEC_HANG_NGAY.csv",
        "index.html",
        "style.css",
        "app.js",
        "server.py",
        "google_apps_script.js",
        "Dockerfile",
        "docker-compose.yml",
        "email_reminder_service.py"
    ]

    for fname in files_to_sync:
        src = os.path.join(BASE_DIR, fname)
        if os.path.exists(src):
            dst = os.path.join(NAS_TARGET_DIR, fname)
            shutil.copy2(src, dst)
            print(f"✓ Đã sao lưu về NAS: {fname}")

    # Also copy Excel file from Desktop if present
    excel_src = r"C:\Users\HUY\Desktop\Quan_Ly_Cong_Viec_Ca_Nhan_AppSheet.xlsx"
    if os.path.exists(excel_src):
        shutil.copy2(excel_src, os.path.join(NAS_TARGET_DIR, "Quan_Ly_Cong_Viec_Ca_Nhan_AppSheet.xlsx"))
        print("✓ Đã sao lưu file Excel về NAS!")

    print(f"✅ Hoàn tất sao lưu toàn bộ dữ liệu về NAS Kiểu Việt lúc {datetime.datetime.now().strftime('%H:%M:%S %d/%m/%Y')}!")
    return True

if __name__ == "__main__":
    sync_to_nas()
