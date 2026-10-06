import os
import sys
import json
import urllib.request
import urllib.parse
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "tasks_data.json")
DEFAULT_EMAIL = "nguyenthanhtrongnhan14@gmail.com"

def get_today_tasks(date_str=None):
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        tasks = json.load(f)
    
    if not date_str:
        now = datetime.now()
        date_str = f"2026-10-{now.day:02d}"
        
    today_tasks = [t for t in tasks if t.get("Date") == date_str]
    return today_tasks

def generate_email_digest(tasks, recipient=DEFAULT_EMAIL, date_str="2026-10-06"):
    morning = [t for t in tasks if "Sáng" in t.get("Session", "")]
    afternoon = [t for t in tasks if "Chiều" in t.get("Session", "")]
    evening = [t for t in tasks if "Tối" in t.get("Session", "")]
    
    total = len(tasks)
    done = len([t for t in tasks if t.get("Checklist_Done") in [True, "true", "True", 1]])
    
    lines = []
    lines.append(f"🌸 [KIỂU VIỆT DAILY PLANNER] LỊCH LÀM VIỆC NGÀY {date_str}")
    lines.append(f"Gửi tới: {recipient}")
    lines.append(f"Tiến độ: {done}/{total} công việc đã hoàn thành")
    lines.append("=" * 50)
    lines.append("🌅 BUỔI SÁNG:")
    for t in morning:
        icon = "✅" if t.get("Checklist_Done") in [True, "true"] else "⚪"
        lines.append(f"  {icon} {t.get('Start_Time')} - {t.get('End_Time')} | {t.get('Title')} ({t.get('Priority')})")
    lines.append("\n🌇 BUỔI CHIỀU:")
    for t in afternoon:
        icon = "✅" if t.get("Checklist_Done") in [True, "true"] else "⚪"
        lines.append(f"  {icon} {t.get('Start_Time')} - {t.get('End_Time')} | {t.get('Title')} ({t.get('Priority')})")
    if evening:
        lines.append("\n🌙 BUỔI TỐI:")
        for t in evening:
            icon = "✅" if t.get("Checklist_Done") in [True, "true"] else "⚪"
            lines.append(f"  {icon} {t.get('Start_Time')} - {t.get('End_Time')} | {t.get('Title')} ({t.get('Priority')})")
    lines.append("=" * 50)
    lines.append(f"Truy cập ứng dụng live: https://bombeodeptrai.github.io/starnest-daily-planner/")
    return "\n".join(lines)

def send_via_google_apps_script(gas_url, recipient=DEFAULT_EMAIL, date_str="2026-10-06"):
    if not gas_url:
        print("Chưa cấu hình Google Apps Script URL.")
        return False
    payload = json.dumps({
        "action": "send_email_now",
        "email": recipient,
        "date": date_str
    }).encode("utf-8")
    req = urllib.request.Request(gas_url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"Kết quả gửi qua Google Apps Script: {data}")
            return data.get("success", False)
    except Exception as e:
        print(f"Lỗi kết nối GAS: {e}")
        return False

if __name__ == "__main__":
    tasks = get_today_tasks("2026-10-06")
    digest = generate_email_digest(tasks, DEFAULT_EMAIL, "2026-10-06")
    print(digest)
    print("\n✓ Đã tạo bản tin nhắc lịch gửi tới email:", DEFAULT_EMAIL)
