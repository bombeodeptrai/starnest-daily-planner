import http.server
import socketserver
import json
import os
import subprocess
import time
import pandas as pd
from urllib.parse import urlparse, parse_qs

PORT = 8089
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "tasks_data.json")
CSV_FILE = os.path.join(BASE_DIR, "CONG_VIEC_HANG_NGAY.csv")
EXCEL_FILE = r"C:\Users\HUY\Desktop\Quan_Ly_Cong_Viec_Ca_Nhan_AppSheet.xlsx"
GSHEET_URL = "https://docs.google.com/spreadsheets/d/17m8vSgdCiKNq15dPWtOq96sRnh3bssvHsnA3OzSnLBE/edit"
BRAVE_PATH = r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
USER_DATA = r"C:\Users\HUY\AppData\Local\BraveSoftware\Brave-Browser\User Data"

def load_tasks():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    elif os.path.exists(CSV_FILE):
        df = pd.read_csv(CSV_FILE)
        df['Checklist_Done'] = df['Checklist_Done'].apply(lambda x: True if str(x).lower() in ['true', '1', 'yes'] else False)
        return df.to_dict(orient="records")
    return []

def save_tasks(tasks):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(tasks, f, ensure_ascii=False, indent=2)
    # Also save to CSV
    df = pd.DataFrame(tasks)
    df.to_csv(CSV_FILE, index=False, encoding="utf-8-sig")
    # Also save to Excel
    try:
        with pd.ExcelWriter(EXCEL_FILE, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name="CONG_VIEC_HANG_NGAY", index=False)
    except Exception as e:
        print("Excel save warning:", e)

def sync_to_google_sheet(tasks):
    """Sync tasks directly to Google Sheet via sync_gsheet_worker.py"""
    worker = os.path.join(BASE_DIR, "sync_gsheet_worker.py")
    subprocess.run(["python", worker], capture_output=True)

class CutePlannerHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/tasks":
            tasks = load_tasks()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "data": tasks, "total": len(tasks)}, ensure_ascii=False).encode("utf-8"))
        elif parsed.path == "/api/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "online",
                "appName": "Lịch Lập Kế Hoạch Hàng Ngày",
                "gsheetId": "17m8vSgdCiKNq15dPWtOq96sRnh3bssvHsnA3OzSnLBE",
                "sheetName": "CONG_VIEC_HANG_NGAY"
            }).encode("utf-8"))
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')
        data = json.loads(post_data) if post_data else {}

        if parsed.path == "/api/tasks/toggle":
            task_id = data.get("id")
            tasks = load_tasks()
            found = False
            for t in tasks:
                if t.get("ID") == task_id:
                    t["Checklist_Done"] = not t.get("Checklist_Done", False)
                    t["Status"] = "✅ Hoàn thành" if t["Checklist_Done"] else "⏳ Chưa hoàn thành"
                    found = True
                    break
            if found:
                save_tasks(tasks)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "message": "Updated task"}).encode("utf-8"))
            else:
                self.send_response(404)
                self.end_headers()

        elif parsed.path == "/api/tasks/add":
            tasks = load_tasks()
            new_id = f"TASK_{1000 + len(tasks) + 1}"
            new_task = {
                "ID": new_id,
                "Title": data.get("title", "Công việc mới"),
                "Date": data.get("date", "2026-10-06"),
                "Start_Time": data.get("start_time", "08:00"),
                "End_Time": data.get("end_time", "09:00"),
                "Session": data.get("session", "🌅 Buổi Sáng"),
                "Day_Of_Week": data.get("day_of_week", "Thứ 3"),
                "Status": "⏳ Chưa hoàn thành",
                "Checklist_Done": False,
                "Priority": data.get("priority", "⭐⭐⭐ Cao"),
                "Category": data.get("category", "💼 Công việc"),
                "Notes": data.get("notes", "")
            }
            tasks.append(new_task)
            save_tasks(tasks)
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "task": new_task}).encode("utf-8"))

        elif parsed.path == "/api/tasks/delete":
            task_id = data.get("id")
            tasks = load_tasks()
            tasks = [t for t in tasks if t.get("ID") != task_id]
            save_tasks(tasks)
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "message": "Deleted task"}).encode("utf-8"))

        elif parsed.path == "/api/sync-gsheet":
            tasks = load_tasks()
            try:
                sync_to_google_sheet(tasks)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True, 
                    "message": f"Đã đồng bộ đủ 100% ({len(tasks)} việc) lên Google Sheet!",
                    "gsheetUrl": GSHEET_URL
                }, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), CutePlannerHandler) as httpd:
        print(f"Cute Planner Server running on http://127.0.0.1:{PORT}")
        httpd.serve_forever()
