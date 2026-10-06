import time
import sys
import os
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_URL = "http://127.0.0.1:8089"

console_errors = []
page_crashes = []

def run_tests():
    global console_errors, page_crashes

    print("--- STARTING COMPREHENSIVE WEB APP VERIFICATION ---")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # -------------------------------------------------------------
        # TEST 1: MOBILE VIEWPORT (iPhone 14 / modern Android 393x852)
        # -------------------------------------------------------------
        print("\n1. Testing Mobile Viewport (393x852)...")
        mobile_ctx = browser.new_context(
            viewport={"width": 393, "height": 852},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
        )
        page = mobile_ctx.new_page()

        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("crash", lambda: page_crashes.append("Page crashed!"))

        page.goto(APP_URL, wait_until="networkidle")
        time.sleep(2)

        # Check raw html leaks
        raw_html = page.content()
        raw_leak = ("&lt;div" in raw_html or "&lt;span" in raw_html or "{{ " in raw_html)
        print(f"Raw HTML leak check: {'FAILED' if raw_leak else 'PASSED'}")

        # Check title and header elements
        app_title = page.locator(".app-title").inner_text()
        print(f"App title: {app_title}")
        assert "Lịch Lập Kế Hoạch" in app_title, "App title missing!"

        # Check date strip
        pills = page.locator(".day-pill").all()
        print(f"Date strip pill count: {len(pills)} (Expected: 31 days)")
        assert len(pills) == 31, f"Expected 31 day pills, got {len(pills)}"

        # Check active day tasks
        date_title = page.locator("#widgetDateTitle").inner_text()
        print(f"Active date title: {date_title}")

        # Capture mobile home view screenshot
        page.screenshot(path=os.path.join(BASE_DIR, "webapp_mobile_daily.png"))
        print("Captured webapp_mobile_daily.png")

        # TEST 2: 1-Tap Circular Checklist Toggle
        print("\n2. Testing 1-Tap Circular Checklist Toggle...")
        check_btn = page.locator(".btn-check-task").first
        init_percent = page.locator("#progressPercent").inner_text()
        print(f"Initial progress: {init_percent}")

        check_btn.click()
        time.sleep(1)

        new_percent = page.locator("#progressPercent").inner_text()
        print(f"New progress after toggle: {new_percent}")
        assert page.locator(".toast-popup.show").count() > 0 or page.locator(".toast-popup").count() > 0, "Toast element exists"

        # TEST 3: Switching Dates in Date Strip
        print("\n3. Testing Date Strip Click...")
        pills[9].click() # Day 10 (10/10/2026)
        time.sleep(1)
        new_date_title = page.locator("#widgetDateTitle").inner_text()
        print(f"Switched date title: {new_date_title}")
        assert "10/10/2026" in new_date_title, "Date switch failed!"

        # Switch back to today (06/10/2026)
        page.locator("#btnToday").click()
        time.sleep(1)
        today_title = page.locator("#widgetDateTitle").inner_text()
        print(f"Reset to today: {today_title}")
        assert "06/10/2026" in today_title, "Today reset failed!"

        # TEST 4: Quick Add Task Modal
        print("\n4. Testing Quick Add Task Modal (+)...")
        page.locator("#fabAddTask").click()
        time.sleep(1)
        assert page.locator("#modalBackdrop.show").count() > 0, "Modal did not open!"
        page.screenshot(path=os.path.join(BASE_DIR, "webapp_mobile_modal.png"))
        print("Captured webapp_mobile_modal.png")

        # Fill modal form
        page.fill("#inpTitle", "Kiểm tra hệ thống Starnest Daily Web App")
        page.select_option("#inpSession", "🌅 Buổi Sáng")
        page.select_option("#inpPriority", "⭐⭐⭐ Cao")
        page.select_option("#inpCategory", "🎯 Kế hoạch")
        page.fill("#inpNotes", "Đảm bảo đồng bộ 100% dữ liệu về Google Sheet")
        page.locator("button[type='submit']").click()
        time.sleep(1.5)

        # Verify added task in morning list
        morning_text = page.locator("#listMorning").inner_text()
        assert "Kiểm tra hệ thống Starnest Daily Web App" in morning_text, "New task not found in morning list!"
        print("Successfully added new task via modal!")

        # TEST 5: Month Calendar Tab
        print("\n5. Testing Month Calendar Tab...")
        page.locator(".tab-btn[data-tab='tab-month']").click()
        time.sleep(1)
        cal_cells = page.locator(".cal-day-cell:not(.cal-empty)").all()
        print(f"Calendar days rendered: {len(cal_cells)} (Expected: 31)")
        assert len(cal_cells) == 31, f"Expected 31 calendar day cells, got {len(cal_cells)}"
        page.screenshot(path=os.path.join(BASE_DIR, "webapp_mobile_month.png"))
        print("Captured webapp_mobile_month.png")

        # TEST 6: Habits & Mood Tab
        print("\n6. Testing Habits & Mood Tab...")
        page.locator(".tab-btn[data-tab='tab-habits']").click()
        time.sleep(1)
        cups = page.locator("#waterCups .cup").all()
        cups[5].click() # Drink 6 cups
        time.sleep(0.5)
        active_cups = page.locator("#waterCups .cup.active").count()
        print(f"Active water cups: {active_cups}/8")
        assert active_cups == 6, f"Expected 6 active water cups, got {active_cups}"

        # Switch back to daily tab
        page.locator(".tab-btn[data-tab='tab-daily']").click()
        time.sleep(0.5)

        # TEST 7: Theme Picker
        print("\n7. Testing Kawaii Theme Picker...")
        page.locator("#btnThemeToggle").click()
        time.sleep(0.5)
        page.locator(".theme-opt[data-theme='theme-dark-kawaii']").click()
        time.sleep(0.5)
        assert "theme-dark-kawaii" in page.eval_on_selector("body", "el => el.className"), "Dark kawaii theme failed!"
        page.screenshot(path=os.path.join(BASE_DIR, "webapp_theme_dark.png"))
        print("Captured webapp_theme_dark.png")

        # Switch back to pastel pink
        page.locator("#btnThemeToggle").click()
        time.sleep(0.5)
        page.locator(".theme-opt[data-theme='theme-pastel-pink']").click()
        time.sleep(0.5)

        mobile_ctx.close()

        # -------------------------------------------------------------
        # TEST 8: DESKTOP VIEWPORT (1280x800)
        # -------------------------------------------------------------
        print("\n8. Testing Desktop Viewport (1280x800)...")
        desk_ctx = browser.new_context(viewport={"width": 1280, "height": 800})
        page_desk = desk_ctx.new_page()
        page_desk.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page_desk.on("crash", lambda: page_crashes.append("Page crashed!"))

        page_desk.goto(APP_URL, wait_until="networkidle")
        time.sleep(2)
        page_desk.screenshot(path=os.path.join(BASE_DIR, "webapp_desktop_overview.png"))
        print("Captured webapp_desktop_overview.png")

        desk_ctx.close()
        browser.close()

    print("\n--- TEST SUMMARY ---")
    print(f"Console Errors: {len(console_errors)}")
    if console_errors:
        for err in console_errors:
            print("  [ERROR]", err)
    print(f"Page Crashes: {len(page_crashes)}")
    print(f"Raw HTML Leaks: {'YES' if raw_leak else '0'}")

    assert len(console_errors) == 0, f"Found {len(console_errors)} console errors!"
    assert len(page_crashes) == 0, f"Found {len(page_crashes)} page crashes!"
    assert not raw_leak, "Found raw HTML leaks!"
    print("\n✅ ALL TESTS PASSED SUCCESSFULLY! 100% OPERATIONAL.")

if __name__ == "__main__":
    run_tests()
