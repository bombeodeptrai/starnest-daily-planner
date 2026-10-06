import subprocess
import time
import sys
import os
import json
import pandas as pd
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "tasks_data.json")
BRAVE_PATH = r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
USER_DATA = r"C:\Users\HUY\AppData\Local\BraveSoftware\Brave-Browser\User Data"
SHEET_URL = "https://docs.google.com/spreadsheets/d/17m8vSgdCiKNq15dPWtOq96sRnh3bssvHsnA3OzSnLBE/edit"

def run_sync():
    if not os.path.exists(DATA_FILE):
        print("Data file not found!")
        return False

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        tasks = json.load(f)

    df = pd.DataFrame(tasks)
    tsv_data = df.to_csv(sep="\t", index=False)

    print(f"Preparing to sync {len(tasks)} tasks to Google Sheet...")

    # Check if Brave is reachable via CDP on port 9222
    connected = False
    browser = None
    p = None

    try:
        p = sync_playwright().start()
        try:
            browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222", timeout=3000)
            connected = True
        except Exception:
            print("Port 9222 not reachable. Launching Brave with remote debugging...")
            subprocess.run(["powershell", "-Command", "Stop-Process -Name brave -Force -ErrorAction SilentlyContinue"], capture_output=True)
            time.sleep(2)
            subprocess.Popen(
                [BRAVE_PATH, f"--user-data-dir={USER_DATA}", "--remote-debugging-port=9222", SHEET_URL],
                creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
            )
            time.sleep(8)
            browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222", timeout=10000)
            connected = True

        if connected and browser:
            ctx = browser.contexts[0]
            ctx.grant_permissions(["clipboard-read", "clipboard-write"])
            
            # Find or navigate to Google Sheet
            page = None
            for pg in ctx.pages:
                if "17m8vSgdCiKNq15dPWtOq96sRnh3bssvHsnA3OzSnLBE" in pg.url or "docs.google.com/spreadsheets" in pg.url:
                    page = pg
                    break

            if not page:
                page = ctx.new_page()
                page.goto(SHEET_URL, wait_until="domcontentloaded")
                time.sleep(8)
            else:
                page.bring_to_front()
                time.sleep(2)

            # Click CONG_VIEC_HANG_NGAY tab
            print("Selecting CONG_VIEC_HANG_NGAY tab...")
            tab = page.locator("text='CONG_VIEC_HANG_NGAY'").first
            if tab.count() > 0:
                tab.click()
                time.sleep(2)

            # Select cell A1
            name_box = page.locator("#t-name-box").first
            if name_box.count() > 0:
                name_box.click()
                name_box.fill("A1")
                page.keyboard.press("Enter")
                time.sleep(1)

            # Write TSV data to clipboard & paste
            print(f"Pasting {len(tasks)} tasks...")
            page.evaluate("content => navigator.clipboard.writeText(content)", tsv_data)
            time.sleep(1)
            page.keyboard.press("Control+v")
            time.sleep(4)

            print("Successfully synced 100% of tasks to Google Sheet!")
            return True
    except Exception as e:
        print(f"Sync error: {e}")
        return False
    finally:
        if p:
            p.stop()

if __name__ == "__main__":
    run_sync()
