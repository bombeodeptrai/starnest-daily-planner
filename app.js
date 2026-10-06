/**
 * STARNEST STYLE DAILY PLANNER - FRONTEND JAVASCRIPT
 * Full-featured interactive planner with Google Sheets sync, 
 * 1-tap circular checklist, pastel theme picker, habit tracker, and calendar.
 */

// Helper: Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const DOW_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const DOW_FULL = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

class StarnestPlannerApp {
  constructor() {
    this.tasks = [];
    this.selectedDate = "2026-10-06"; // Default active day
    this.currentYear = 2026;
    this.currentMonth = 9; // 0-indexed: 9 = October
    this.waterCount = parseInt(localStorage.getItem("planner_water_count") || "4", 10);
    this.currentMood = localStorage.getItem("planner_current_mood") || "good";
    this.currentTheme = localStorage.getItem("planner_theme") || "theme-pastel-pink";
    this.originalEditTitle = "";

    // Schedule Reminders (Nhắc lịch)
    this.remindersEnabled = localStorage.getItem("planner_reminders_enabled") !== "false";
    this.triggeredReminders = new Set();

    // Default daily routine templates (lặp lại mỗi ngày)
    this.defaultRoutines = JSON.parse(localStorage.getItem("planner_default_routines") || "null") || [
      { title: "Uống 500ml nước ấm & Khởi động", session: "🌅 Buổi Sáng", start: "06:00", end: "06:30", category: "🧘 Sức khỏe", priority: "⭐⭐⭐ Cao" },
      { title: "Thể dục buổi sáng / Chạy bộ", session: "🌅 Buổi Sáng", start: "06:30", end: "07:15", category: "🧘 Sức khỏe", priority: "⭐⭐⭐ Cao" },
      { title: "Ăn sáng dinh dưỡng & Lập mục tiêu ngày", session: "🌅 Buổi Sáng", start: "07:15", end: "08:00", category: "🏠 Cá nhân", priority: "⭐⭐ Trung bình" },
      { title: "Xử lý công việc trọng tâm trong ngày", session: "🌇 Buổi Chiều", start: "13:30", end: "15:30", category: "💼 Công việc", priority: "⭐⭐⭐ Cao" },
      { title: "Rà soát tiến độ & Hoàn thành checklist", session: "🌇 Buổi Chiều", start: "15:30", end: "16:30", category: "🎯 Kế hoạch", priority: "⭐⭐⭐ Cao" },
      { title: "Đọc sách / Nâng cao kỹ năng cá nhân", session: "🌇 Buổi Chiều", start: "16:30", end: "17:30", category: "📚 Học tập", priority: "⭐⭐ Trung bình" }
    ];

    this.initElements();
    this.applyTheme(this.currentTheme);
    this.bindEvents();
    this.loadData();
    this.startReminderChecker();
  }

  initElements() {
    // Theme elements
    this.btnThemeToggle = document.getElementById("btnThemeToggle");
    this.themeMenu = document.getElementById("themeMenu");
    this.themeOptions = document.querySelectorAll(".theme-opt");

    // Header & Navigation
    this.btnSyncGsheet = document.getElementById("btnSyncGsheet");
    this.btnRoutineTemplates = document.getElementById("btnRoutineTemplates");
    this.btnReminderToggle = document.getElementById("btnReminderToggle");
    this.prevMonthBtn = document.getElementById("prevMonthBtn");
    this.nextMonthBtn = document.getElementById("nextMonthBtn");
    this.currentMonthLabel = document.getElementById("currentMonthLabel");
    this.btnToday = document.getElementById("btnToday");
    this.dateStrip = document.getElementById("dateStrip");
    this.tabs = document.querySelectorAll(".tab-btn");
    this.tabContents = document.querySelectorAll(".tab-content");

    // Daily View Elements
    this.progressRingFill = document.getElementById("progressRingFill");
    this.progressPercent = document.getElementById("progressPercent");
    this.widgetDateTitle = document.getElementById("widgetDateTitle");
    this.widgetQuote = document.getElementById("widgetQuote");
    this.statCompleted = document.getElementById("statCompleted");
    this.statTotal = document.getElementById("statTotal");
    this.moodBtns = document.querySelectorAll(".mood-btn");

    // Session Lists
    this.countMorning = document.getElementById("countMorning");
    this.listMorning = document.getElementById("listMorning");
    this.countAfternoon = document.getElementById("countAfternoon");
    this.listAfternoon = document.getElementById("listAfternoon");
    this.countEvening = document.getElementById("countEvening");
    this.listEvening = document.getElementById("listEvening");

    // Month Tab
    this.calendarDaysGrid = document.getElementById("calendarDaysGrid");

    // Habits Tab
    this.waterCups = document.querySelectorAll("#waterCups .cup");

    // Modal Add/Edit Task
    this.fabAddTask = document.getElementById("fabAddTask");
    this.modalBackdrop = document.getElementById("modalBackdrop");
    this.btnCloseModal = document.getElementById("btnCloseModal");
    this.btnCancelModal = document.getElementById("btnCancelModal");
    this.addPlanForm = document.getElementById("addPlanForm");
    this.modalBadgeIcon = document.getElementById("modalBadgeIcon");
    this.modalTitleText = document.getElementById("modalTitleText");
    this.btnSubmitModal = document.getElementById("btnSubmitModal");
    this.inpEditTaskId = document.getElementById("inpEditTaskId");
    this.editScopeGroup = document.getElementById("editScopeGroup");
    this.inpTitle = document.getElementById("inpTitle");
    this.inpDate = document.getElementById("inpDate");
    this.inpSession = document.getElementById("inpSession");
    this.inpStartTime = document.getElementById("inpStartTime");
    this.inpEndTime = document.getElementById("inpEndTime");
    this.inpPriority = document.getElementById("inpPriority");
    this.inpCategory = document.getElementById("inpCategory");
    this.inpNotes = document.getElementById("inpNotes");
    this.inpReminder = document.getElementById("inpReminder");

    // Routine Templates Modal Elements
    this.modalRoutineTemplates = document.getElementById("modalRoutineTemplates");
    this.btnCloseRoutineModal = document.getElementById("btnCloseRoutineModal");
    this.btnCancelRoutineModal = document.getElementById("btnCancelRoutineModal");
    this.routineListContainer = document.getElementById("routineListContainer");
    this.btnAddRoutineItem = document.getElementById("btnAddRoutineItem");
    this.btnApplyRoutinesAllMonth = document.getElementById("btnApplyRoutinesAllMonth");

    // Reminder Alarm Banner Elements
    this.reminderAlertCard = document.getElementById("reminderAlertCard");
    this.reminderAlertTitle = document.getElementById("reminderAlertTitle");
    this.reminderAlertTime = document.getElementById("reminderAlertTime");
    this.btnReminderAck = document.getElementById("btnReminderAck");

    // Update reminder toggle button state
    if (this.btnReminderToggle) {
      if (this.remindersEnabled) {
        this.btnReminderToggle.classList.add("active");
      } else {
        this.btnReminderToggle.classList.remove("active");
      }
    }

    // Toast
    this.toastPopup = document.getElementById("toastPopup");
    this.toastMessage = document.getElementById("toastMessage");
  }

  showToast(message, icon = "✨", duration = 2500) {
    if (!this.toastPopup) return;
    this.toastMessage.textContent = message;
    const iconEl = this.toastPopup.querySelector(".toast-icon");
    if (iconEl) iconEl.textContent = icon;
    this.toastPopup.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastPopup.classList.remove("show");
    }, duration);
  }

  applyTheme(themeName) {
    document.body.className = themeName;
    localStorage.setItem("planner_theme", themeName);
    this.currentTheme = themeName;
    if (this.themeOptions) {
      this.themeOptions.forEach(opt => {
        if (opt.dataset.theme === themeName) {
          opt.classList.add("active");
        } else {
          opt.classList.remove("active");
        }
      });
    }
  }

  async loadData() {
    // Only fetch /api/tasks if running on custom backend server (port 8089)
    const isLocalBackend = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") && window.location.port === "8089";

    if (isLocalBackend) {
      try {
        const resp = await fetch("/api/tasks");
        if (resp.ok) {
          const json = await resp.json();
          this.tasks = json.data || [];
        } else {
          throw new Error("API response not ok");
        }
      } catch (e) {
        console.warn("Local API not available, loading fallback tasks_data.json");
        await this.loadFallbackData();
      }
    } else {
      // On GitHub Pages: Load directly from tasks_data.json
      await this.loadFallbackData();
    }

    if (this.tasks && this.tasks.length > 0) {
      localStorage.setItem("planner_tasks_cache", JSON.stringify(this.tasks));
    }

    this.renderAll();
  }

  async loadFallbackData() {
    try {
      const localResp = await fetch("tasks_data.json");
      this.tasks = await localResp.json();
    } catch (err) {
      const cached = localStorage.getItem("planner_tasks_cache");
      if (cached) {
        this.tasks = JSON.parse(cached);
      }
    }
  }

  bindEvents() {
    // Theme Dropdown Toggle
    if (this.btnThemeToggle) {
      this.btnThemeToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        this.themeMenu.classList.toggle("show");
      });
    }

    document.addEventListener("click", (e) => {
      if (this.themeMenu && !this.themeMenu.contains(e.target) && e.target !== this.btnThemeToggle) {
        this.themeMenu.classList.remove("show");
      }
    });

    if (this.themeOptions) {
      this.themeOptions.forEach(opt => {
        opt.addEventListener("click", () => {
          const t = opt.dataset.theme;
          this.applyTheme(t);
          this.themeMenu.classList.remove("show");
          this.showToast("Đã đổi giao diện thành công! 🎨");
        });
      });
    }

    // Google Sheets Sync Button (Support both Cloud Apps Script & Local/NAS Backend)
    if (this.btnSyncGsheet) {
      this.btnSyncGsheet.addEventListener("click", async () => {
        const originalText = this.btnSyncGsheet.innerHTML;
        this.btnSyncGsheet.innerHTML = `<span class="sync-dot"></span> ⏳ Đang lưu...`;
        this.btnSyncGsheet.disabled = true;

        const gasUrl = localStorage.getItem("planner_gas_url");

        // Strategy A: If running on Localhost/NAS with server.py
        if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
          try {
            const resp = await fetch("/api/sync-gsheet", {
              method: "POST",
              headers: { "Content-Type": "application/json" }
            });
            const res = await resp.json();
            if (res.success) {
              this.showToast("Đã lưu 100% dữ liệu vào Google Sheet! ☁️💖", "☁️", 3500);
            } else {
              this.showToast("Lỗi đồng bộ Google Sheet: " + (res.error || "Thử lại sau"), "⚠️", 3500);
            }
          } catch (err) {
            console.warn("Backend sync failed, using cloud fallback:", err);
            this.handleGasSync(gasUrl);
          } finally {
            this.btnSyncGsheet.innerHTML = originalText;
            this.btnSyncGsheet.disabled = false;
          }
        } else {
          // Strategy B: Running on GitHub Pages
          await this.handleGasSync(gasUrl);
          this.btnSyncGsheet.innerHTML = originalText;
          this.btnSyncGsheet.disabled = false;
        }
      });
    }

    // Month Navigation
    if (this.prevMonthBtn) {
      this.prevMonthBtn.addEventListener("click", () => {
        this.shiftSelectedDay(-1);
      });
    }
    if (this.nextMonthBtn) {
      this.nextMonthBtn.addEventListener("click", () => {
        this.shiftSelectedDay(1);
      });
    }
    if (this.btnToday) {
      this.btnToday.addEventListener("click", () => {
        this.selectDate("2026-10-06");
        this.showToast("Đã chuyển về hôm nay! 🎯");
      });
    }

    // Tabs Switcher
    if (this.tabs) {
      this.tabs.forEach(tab => {
        tab.addEventListener("click", () => {
          this.tabs.forEach(t => t.classList.remove("active"));
          this.tabContents.forEach(c => c.classList.remove("active"));

          tab.classList.add("active");
          const targetId = tab.dataset.tab;
          const targetContent = document.getElementById(targetId);
          if (targetContent) {
            targetContent.classList.add("active");
          }

          if (targetId === "tab-month") {
            this.renderMonthCalendar();
          }
        });
      });
    }

    // Mood Tracker Buttons
    if (this.moodBtns) {
      this.moodBtns.forEach(btn => {
        if (btn.dataset.mood === this.currentMood) {
          btn.classList.add("active");
        }
        btn.addEventListener("click", () => {
          this.moodBtns.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          this.currentMood = btn.dataset.mood;
          localStorage.setItem("planner_current_mood", this.currentMood);
          this.showToast("Đã lưu tâm trạng của bạn hôm nay! " + btn.textContent);
        });
      });
    }

    // Habit Water Cups
    this.renderWaterCups();
    if (this.waterCups) {
      this.waterCups.forEach((cup, idx) => {
        cup.addEventListener("click", () => {
          this.waterCount = idx + 1;
          localStorage.setItem("planner_water_count", this.waterCount);
          this.renderWaterCups();
          this.showToast(`Tuyệt vời! Bạn đã uống ${this.waterCount}/8 ly nước hôm nay 💧`);
        });
      });
    }

    // Add Task FAB & Modal
    if (this.fabAddTask) {
      this.fabAddTask.addEventListener("click", () => {
        this.openAddModal();
      });
    }
    if (this.btnCloseModal) {
      this.btnCloseModal.addEventListener("click", () => this.closeAddModal());
    }
    if (this.btnCancelModal) {
      this.btnCancelModal.addEventListener("click", () => this.closeAddModal());
    }
    if (this.modalBackdrop) {
      this.modalBackdrop.addEventListener("click", (e) => {
        if (e.target === this.modalBackdrop) this.closeAddModal();
      });
    }

    // Form Submit
    if (this.addPlanForm) {
      this.addPlanForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleAddTaskSubmit();
      });
    }

    // Routine Templates Modal Events
    if (this.btnRoutineTemplates) {
      this.btnRoutineTemplates.addEventListener("click", () => {
        this.openRoutineModal();
      });
    }
    if (this.btnCloseRoutineModal) {
      this.btnCloseRoutineModal.addEventListener("click", () => this.closeRoutineModal());
    }
    if (this.btnCancelRoutineModal) {
      this.btnCancelRoutineModal.addEventListener("click", () => this.closeRoutineModal());
    }
    if (this.modalRoutineTemplates) {
      this.modalRoutineTemplates.addEventListener("click", (e) => {
        if (e.target === this.modalRoutineTemplates) this.closeRoutineModal();
      });
    }
    if (this.btnAddRoutineItem) {
      this.btnAddRoutineItem.addEventListener("click", () => {
        this.defaultRoutines.push({
          title: "Công việc mẫu mới",
          session: "🌅 Buổi Sáng",
          start: "08:00",
          end: "09:00",
          category: "💼 Công việc",
          priority: "⭐⭐⭐ Cao"
        });
        this.renderRoutineList();
      });
    }
    if (this.btnApplyRoutinesAllMonth) {
      this.btnApplyRoutinesAllMonth.addEventListener("click", () => {
        this.applyRoutinesToAllMonth();
      });
    }

    // Reminder Alarm Toggle Button Event
    if (this.btnReminderToggle) {
      this.btnReminderToggle.addEventListener("click", () => {
        this.remindersEnabled = !this.remindersEnabled;
        localStorage.setItem("planner_reminders_enabled", this.remindersEnabled ? "true" : "false");
        if (this.remindersEnabled) {
          this.btnReminderToggle.classList.add("active");
          this.playChimeSound();
          if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
          }
          this.showToast("Đã BẬT chuông nhắc hẹn công việc! 🔔✨", "🔔", 3000);
          this.checkUpcomingReminders();
        } else {
          this.btnReminderToggle.classList.remove("active");
          if (this.reminderAlertCard) this.reminderAlertCard.classList.remove("show");
          this.showToast("Đã TẮT chuông nhắc hẹn! 🔕", "🔕", 2500);
        }
      });
    }

    // Reminder Alarm Dismiss / Acknowledge Button
    if (this.btnReminderAck) {
      this.btnReminderAck.addEventListener("click", () => {
        if (this.reminderAlertCard) {
          this.reminderAlertCard.classList.remove("show");
        }
      });
    }
  }

  async handleGasSync(gasUrl) {
    let url = gasUrl;
    if (!url) {
      url = prompt(
        "Nhập Web App URL từ Google Apps Script để lưu trực tiếp lên Google Sheet:\\n(Xem hướng dẫn cài đặt trong google_apps_script.js)",
        ""
      );
      if (url && url.trim().startsWith("http")) {
        localStorage.setItem("planner_gas_url", url.trim());
      } else {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.tasks, null, 2));
        const dlAnchor = document.createElement("a");
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", "tasks_data_backup.json");
        dlAnchor.click();
        this.showToast("Dữ liệu đã lưu trên trình duyệt & tải file sao lưu! 💾", "💾", 3500);
        return;
      }
    }

    try {
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_all", tasks: this.tasks })
      });
      this.showToast("Đã gửi yêu cầu lưu 100% dữ liệu lên Google Sheet! ☁️💖", "☁️", 3500);
    } catch (err) {
      console.error("GAS sync error:", err);
      this.showToast("Lỗi kết nối Cloud Google: " + err.message, "⚠️", 3500);
    }
  }

  shiftSelectedDay(offset) {
    const parts = this.selectedDate.split("-");
    const currentDay = parseInt(parts[2], 10);
    let nextDay = currentDay + offset;
    if (nextDay < 1) nextDay = 1;
    if (nextDay > 31) nextDay = 31;
    const nextDate = `2026-10-${String(nextDay).padStart(2, '0')}`;
    this.selectDate(nextDate);
  }

  selectDate(dateStr) {
    this.selectedDate = dateStr;
    this.renderDateStrip();
    this.renderDailyRoutine();
    this.renderMonthCalendar();

    // Scroll active date pill smoothly into view
    const activePill = this.dateStrip.querySelector(`.day-pill[data-date="${dateStr}"]`);
    if (activePill) {
      activePill.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }

  renderAll() {
    this.renderDateStrip();
    this.renderDailyRoutine();
    this.renderMonthCalendar();
    this.renderWaterCups();
  }

  renderDateStrip() {
    if (!this.dateStrip) return;
    this.dateStrip.innerHTML = "";

    // Month October 2026 has 31 days
    for (let day = 1; day <= 31; day++) {
      const dateStr = `2026-10-${String(day).padStart(2, '0')}`;
      const d = new Date(2026, 9, day);
      const dow = DOW_SHORT[d.getDay()];
      const isActive = dateStr === this.selectedDate;

      // Count tasks for this day
      const dayTasks = this.tasks.filter(t => t.Date === dateStr);
      const hasTasks = dayTasks.length > 0;

      const pill = document.createElement("div");
      pill.className = `day-pill ${isActive ? "active" : ""}`;
      pill.dataset.date = dateStr;
      pill.innerHTML = `
        <span class="pill-dow">${dow}</span>
        <span class="pill-date">${day}</span>
        ${hasTasks ? '<span class="pill-dot"></span>' : ''}
      `;

      pill.addEventListener("click", () => {
        this.selectDate(dateStr);
      });

      this.dateStrip.appendChild(pill);
    }
  }

  renderDailyRoutine() {
    const dayTasks = this.tasks.filter(t => t.Date === this.selectedDate);
    const parts = this.selectedDate.split("-");
    const dayNum = parseInt(parts[2], 10);
    const d = new Date(2026, 9, dayNum);
    const dowFull = DOW_FULL[d.getDay()];

    // Title & Stats
    if (this.widgetDateTitle) {
      this.widgetDateTitle.textContent = `${dowFull}, ${String(dayNum).padStart(2, '0')}/10/2026`;
    }

    const total = dayTasks.length;
    const completed = dayTasks.filter(t => t.Checklist_Done === true || t.Checklist_Done === "true").length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    if (this.statCompleted) this.statCompleted.textContent = completed;
    if (this.statTotal) this.statTotal.textContent = total;
    if (this.progressPercent) this.progressPercent.textContent = `${percent}%`;

    // Progress Ring SVG animation
    if (this.progressRingFill) {
      const circumference = 175.9; // 2 * PI * 28
      const offset = circumference - (percent / 100) * circumference;
      this.progressRingFill.style.strokeDashoffset = offset;
    }

    // Motivational quote
    if (this.widgetQuote) {
      if (percent === 100 && total > 0) {
        this.widgetQuote.textContent = "Xuất sắc! Bạn đã hoàn thành 100% mục tiêu! 🎉";
      } else if (percent >= 50) {
        this.widgetQuote.textContent = "Tuyệt vời, bạn đã hoàn thành hơn một nửa rồi! 🌸";
      } else {
        this.widgetQuote.textContent = "Tập trung hoàn thành mục tiêu ngày nhé! 🌟";
      }
    }

    // Separate tasks by session
    const morningTasks = dayTasks.filter(t => (t.Session || "").includes("Sáng"));
    const afternoonTasks = dayTasks.filter(t => (t.Session || "").includes("Chiều"));
    const eveningTasks = dayTasks.filter(t => (t.Session || "").includes("Tối"));

    // Render Sessions
    this.renderSessionBlock(this.listMorning, this.countMorning, morningTasks, "🌅 Buổi Sáng");
    this.renderSessionBlock(this.listAfternoon, this.countAfternoon, afternoonTasks, "🌇 Buổi Chiều");
    this.renderSessionBlock(this.listEvening, this.countEvening, eveningTasks, "🌙 Buổi Tối");
  }

  renderSessionBlock(container, countBadge, taskList, sessionName) {
    if (!container) return;
    if (countBadge) {
      countBadge.textContent = `${taskList.length} việc`;
    }

    if (taskList.length === 0) {
      container.innerHTML = `<div class="empty-tasks">Chưa có kế hoạch cho ${sessionName.toLowerCase()} ✨</div>`;
      return;
    }

    container.innerHTML = "";
    taskList.forEach(task => {
      const isDone = task.Checklist_Done === true || task.Checklist_Done === "true";
      const hasReminder = (!task.Reminder || task.Reminder !== "none");
      const reminderBadge = hasReminder ? `<span class="task-reminder-badge" title="Có báo thức nhắc việc">🔔</span>` : "";
      const card = document.createElement("div");
      card.className = `task-card ${isDone ? "completed" : ""}`;
      card.dataset.id = task.ID;

      card.innerHTML = `
        <button class="btn-check-task" title="${isDone ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}">
          ${isDone ? "✓" : ""}
        </button>
        <div class="task-content">
          <div class="task-title">${escapeHtml(task.Title)}</div>
          <div class="task-meta">
            <span class="task-time">⏰ ${escapeHtml(task.Start_Time || "")} - ${escapeHtml(task.End_Time || "")}</span>
            <span class="task-tag">${escapeHtml(task.Category || "Chung")}</span>
            <span class="task-priority">${escapeHtml(task.Priority || "⭐⭐")}</span>
            ${reminderBadge}
          </div>
        </div>
        <div class="task-actions">
          <button class="btn-task-edit" title="Chỉnh sửa công việc">✏️</button>
          <button class="btn-task-del" title="Xóa công việc">🗑️</button>
        </div>
      `;

      // 1-Tap circular checklist toggle
      const checkBtn = card.querySelector(".btn-check-task");
      checkBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleTaskChecklist(task.ID);
      });

      // Also toggle when clicking task content for fast mobile usage
      const contentEl = card.querySelector(".task-content");
      contentEl.addEventListener("click", () => {
        this.toggleTaskChecklist(task.ID);
      });

      // Edit task button
      const editBtn = card.querySelector(".btn-task-edit");
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.openEditModal(task);
      });

      // Delete task button
      const delBtn = card.querySelector(".btn-task-del");
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.deleteTask(task.ID);
      });

      container.appendChild(card);
    });
  }

  async toggleTaskChecklist(taskId) {
    const task = this.tasks.find(t => t.ID === taskId);
    if (!task) return;

    task.Checklist_Done = !task.Checklist_Done;
    task.Status = task.Checklist_Done ? "✅ Hoàn thành" : "⏳ Chưa hoàn thành";

    // Immediate UI update
    this.renderDailyRoutine();
    this.renderMonthCalendar();

    // Cache locally
    localStorage.setItem("planner_tasks_cache", JSON.stringify(this.tasks));

    // Send API update if on local backend
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      try {
        await fetch("/api/tasks/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: taskId })
        });
      } catch (err) {
        console.warn("Toggle sync failed:", err);
      }
    }
    this.showToast(task.Checklist_Done ? "Đã xong: " + task.Title : "Đã chuyển về chưa xong", task.Checklist_Done ? "💖" : "⏳");
  }

  async deleteTask(taskId) {
    const task = this.tasks.find(t => t.ID === taskId);
    const title = task ? task.Title : "công việc";
    this.tasks = this.tasks.filter(t => t.ID !== taskId);

    this.renderDailyRoutine();
    this.renderMonthCalendar();
    this.renderDateStrip();
    localStorage.setItem("planner_tasks_cache", JSON.stringify(this.tasks));

    // Send API update if on local backend
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      try {
        await fetch("/api/tasks/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: taskId })
        });
      } catch (err) {
        console.warn("Delete API failed:", err);
      }
    }
    this.showToast(`Đã xóa: ${title}`, "🗑️");
  }

  openAddModal() {
    if (!this.modalBackdrop) return;
    this.inpEditTaskId.value = "";
    this.originalEditTitle = "";
    if (this.modalBadgeIcon) this.modalBadgeIcon.textContent = "🌸";
    if (this.modalTitleText) this.modalTitleText.textContent = "Thêm Kế Hoạch Mới";
    if (this.btnSubmitModal) this.btnSubmitModal.textContent = "💖 Lưu Kế Hoạch";
    if (this.editScopeGroup) this.editScopeGroup.style.display = "none";

    this.inpDate.value = this.selectedDate;
    this.inpTitle.value = "";
    this.inpNotes.value = "";
    if (this.inpReminder) this.inpReminder.value = "at_time";
    this.modalBackdrop.classList.add("show");
    setTimeout(() => {
      if (this.inpTitle) this.inpTitle.focus();
    }, 100);
  }

  openEditModal(task) {
    if (!this.modalBackdrop) return;
    this.inpEditTaskId.value = task.ID;
    this.originalEditTitle = task.Title;
    if (this.modalBadgeIcon) this.modalBadgeIcon.textContent = "✏️";
    if (this.modalTitleText) this.modalTitleText.textContent = "Chỉnh Sửa Kế Hoạch";
    if (this.btnSubmitModal) this.btnSubmitModal.textContent = "💾 Cập Nhật";
    if (this.editScopeGroup) this.editScopeGroup.style.display = "block";

    this.inpDate.value = task.Date;
    this.inpTitle.value = task.Title;
    this.inpSession.value = task.Session || "🌅 Buổi Sáng";
    this.inpStartTime.value = task.Start_Time || "08:00";
    this.inpEndTime.value = task.End_Time || "09:00";
    this.inpPriority.value = task.Priority || "⭐⭐⭐ Cao";
    this.inpCategory.value = task.Category || "💼 Công việc";
    this.inpNotes.value = task.Notes || "";
    if (this.inpReminder) this.inpReminder.value = task.Reminder || "at_time";

    const singleRadio = document.querySelector('input[name="editScope"][value="single"]');
    if (singleRadio) singleRadio.checked = true;

    this.modalBackdrop.classList.add("show");
    setTimeout(() => {
      if (this.inpTitle) this.inpTitle.focus();
    }, 100);
  }

  closeAddModal() {
    if (this.modalBackdrop) {
      this.modalBackdrop.classList.remove("show");
    }
  }

  async handleAddTaskSubmit() {
    const title = this.inpTitle.value.trim();
    if (!title) return;

    const dateVal = this.inpDate.value;
    const parts = dateVal.split("-");
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const dow = DOW_FULL[d.getDay()];
    const editingId = this.inpEditTaskId.value;

    if (editingId) {
      // Editing existing task
      const scopeRadio = document.querySelector('input[name="editScope"]:checked');
      const scope = scopeRadio ? scopeRadio.value : "single";

      if (scope === "all" && this.originalEditTitle) {
        // Apply to ALL occurrences across all 31 days of the month
        let updatedCount = 0;
        this.tasks.forEach(t => {
          if (t.Title === this.originalEditTitle) {
            t.Title = title;
            t.Start_Time = this.inpStartTime.value;
            t.End_Time = this.inpEndTime.value;
            t.Session = this.inpSession.value;
            t.Priority = this.inpPriority.value;
            t.Category = this.inpCategory.value;
            if (this.inpReminder) t.Reminder = this.inpReminder.value;
            if (this.inpNotes.value.trim()) t.Notes = this.inpNotes.value.trim();
            updatedCount++;
          }
        });

        // Also update defaultRoutines list if matched
        const matchedRoutine = this.defaultRoutines.find(r => r.title === this.originalEditTitle);
        if (matchedRoutine) {
          matchedRoutine.title = title;
          matchedRoutine.start = this.inpStartTime.value;
          matchedRoutine.end = this.inpEndTime.value;
          matchedRoutine.session = this.inpSession.value;
          localStorage.setItem("planner_default_routines", JSON.stringify(this.defaultRoutines));
        }

        this.showToast(`Đã đổi lịch mẫu này cho ${updatedCount} ngày trong tháng! 🌟`, "🚀", 3500);
      } else {
        // Edit single task
        const task = this.tasks.find(t => t.ID === editingId);
        if (task) {
          task.Title = title;
          task.Date = dateVal;
          task.Session = this.inpSession.value;
          task.Start_Time = this.inpStartTime.value;
          task.End_Time = this.inpEndTime.value;
          task.Day_Of_Week = dow;
          task.Priority = this.inpPriority.value;
          task.Category = this.inpCategory.value;
          if (this.inpReminder) task.Reminder = this.inpReminder.value;
          task.Notes = this.inpNotes.value.trim();
        }
        this.showToast("Đã cập nhật công việc thành công! ✨", "✏️");
      }
    } else {
      // Create new task
      const taskPayload = {
        title: title,
        date: dateVal,
        session: this.inpSession.value,
        start_time: this.inpStartTime.value || "08:00",
        end_time: this.inpEndTime.value || "09:00",
        day_of_week: dow,
        priority: this.inpPriority.value,
        category: this.inpCategory.value,
        reminder: this.inpReminder ? this.inpReminder.value : "at_time",
        notes: this.inpNotes.value.trim()
      };

      const newTask = {
        ID: "TASK_" + (1000 + this.tasks.length + 1),
        Title: taskPayload.title,
        Date: taskPayload.date,
        Start_Time: taskPayload.start_time,
        End_Time: taskPayload.end_time,
        Session: taskPayload.session,
        Day_Of_Week: taskPayload.day_of_week,
        Status: "⏳ Chưa hoàn thành",
        Checklist_Done: false,
        Priority: taskPayload.priority,
        Category: taskPayload.category,
        Reminder: taskPayload.reminder,
        Notes: taskPayload.notes
      };

      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        try {
          const resp = await fetch("/api/tasks/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(taskPayload)
          });
          const data = await resp.json();
          if (data.success && data.task) {
            this.tasks.push(data.task);
          } else {
            this.tasks.push(newTask);
          }
        } catch (err) {
          console.warn("Add task API failed, adding locally:", err);
          this.tasks.push(newTask);
        }
      } else {
        this.tasks.push(newTask);
      }
      this.showToast("Đã lưu kế hoạch mới thành công! 💖", "🌸");
    }

    localStorage.setItem("planner_tasks_cache", JSON.stringify(this.tasks));
    this.closeAddModal();
    this.selectDate(dateVal);
  }

  // Routine Templates Management
  openRoutineModal() {
    this.renderRoutineList();
    if (this.modalRoutineTemplates) {
      this.modalRoutineTemplates.classList.add("show");
    }
  }

  closeRoutineModal() {
    if (this.modalRoutineTemplates) {
      this.modalRoutineTemplates.classList.remove("show");
    }
  }

  renderRoutineList() {
    if (!this.routineListContainer) return;
    this.routineListContainer.innerHTML = "";

    this.defaultRoutines.forEach((r, idx) => {
      const item = document.createElement("div");
      item.className = "routine-list-item";
      item.style.display = "flex";
      item.style.alignItems = "center";
      item.style.gap = "8px";
      item.style.marginBottom = "8px";
      item.style.padding = "8px 10px";
      item.style.background = "var(--bg-card-sub)";
      item.style.borderRadius = "var(--radius-sm)";
      item.style.border = "1px solid var(--border-color)";

      item.innerHTML = `
        <select class="routine-input-session" style="padding: 6px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 11px; background: var(--bg-card); color: var(--text-main);">
          <option value="🌅 Buổi Sáng" ${r.session.includes("Sáng") ? "selected" : ""}>🌅 Sáng</option>
          <option value="🌇 Buổi Chiều" ${r.session.includes("Chiều") ? "selected" : ""}>🌇 Chiều</option>
          <option value="🌙 Buổi Tối" ${r.session.includes("Tối") ? "selected" : ""}>🌙 Tối</option>
        </select>
        <input type="text" class="routine-input-title" value="${escapeHtml(r.title)}" placeholder="Tên việc..." style="flex: 1; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 12px; font-weight: 700; background: var(--bg-card); color: var(--text-main);">
        <input type="time" class="routine-input-start" value="${r.start || '08:00'}" style="width: 75px; padding: 5px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 11px; background: var(--bg-card); color: var(--text-main);">
        <button type="button" class="routine-btn-remove" title="Xóa" style="border: none; background: transparent; cursor: pointer; color: #EF4444; font-size: 15px; padding: 4px;">🗑️</button>
      `;

      const titleInput = item.querySelector(".routine-input-title");
      titleInput.addEventListener("input", (e) => {
        r.title = e.target.value;
      });
      const sessionSelect = item.querySelector(".routine-input-session");
      sessionSelect.addEventListener("change", (e) => {
        r.session = e.target.value;
      });
      const startInput = item.querySelector(".routine-input-start");
      startInput.addEventListener("change", (e) => {
        r.start = e.target.value;
      });
      const removeBtn = item.querySelector(".routine-btn-remove");
      removeBtn.addEventListener("click", () => {
        this.defaultRoutines.splice(idx, 1);
        this.renderRoutineList();
      });

      this.routineListContainer.appendChild(item);
    });
  }

  applyRoutinesToAllMonth() {
    if (this.defaultRoutines.length === 0) {
      alert("Danh sách việc mặc định không được để trống!");
      return;
    }

    localStorage.setItem("planner_default_routines", JSON.stringify(this.defaultRoutines));

    // Names of default tasks to replace
    const defaultTitles = new Set(this.defaultRoutines.map(r => r.title));
    const oldKnownTitles = new Set([
      "Uống 500ml nước ấm & Khởi động",
      "Thể dục buổi sáng / Chạy bộ",
      "Ăn sáng dinh dưỡng & Lập mục tiêu ngày",
      "Xử lý công việc trọng tâm trong ngày",
      "Rà soát tiến độ & Hoàn thành checklist",
      "Đọc sách / Nâng cao kỹ năng cá nhân"
    ]);

    // Keep user's custom one-off tasks
    const customTasks = this.tasks.filter(t => !oldKnownTitles.has(t.Title) && !defaultTitles.has(t.Title));

    const newAllTasks = [...customTasks];
    let counter = 1;

    for (let day = 1; day <= 31; day++) {
      const dateStr = `2026-10-${String(day).padStart(2, '0')}`;
      const d = new Date(2026, 9, day);
      const dow = DOW_FULL[d.getDay()];

      this.defaultRoutines.forEach(routine => {
        newAllTasks.push({
          ID: `TASK_${1000 + counter++}`,
          Title: routine.title,
          Date: dateStr,
          Start_Time: routine.start || "08:00",
          End_Time: routine.end || "09:00",
          Session: routine.session,
          Day_Of_Week: dow,
          Status: "⏳ Chưa hoàn thành",
          Checklist_Done: false,
          Priority: routine.priority || "⭐⭐⭐ Cao",
          Category: routine.category || "💼 Công việc",
          Notes: ""
        });
      });
    }

    this.tasks = newAllTasks;
    localStorage.setItem("planner_tasks_cache", JSON.stringify(this.tasks));
    this.closeRoutineModal();
    this.renderAll();
    this.showToast(`Đã áp dụng ${this.defaultRoutines.length} việc mẫu cho cả 31 ngày trong tháng! 🚀✨`, "🎉", 4000);
  }

  renderMonthCalendar() {
    if (!this.calendarDaysGrid) return;
    this.calendarDaysGrid.innerHTML = "";

    // In Oct 2026, 1st Oct is Thursday
    // DOW: T2 (1), T3 (2), T4 (3), T5 (4), T6 (5), T7 (6), CN (0)
    // Offset relative to Monday: Thursday is offset index 3
    const firstDayDate = new Date(2026, 9, 1);
    const jsDow = firstDayDate.getDay(); // 4 = Thu
    // Convert so Monday = 0, Tuesday = 1, ... Sunday = 6
    const offset = (jsDow === 0) ? 6 : jsDow - 1;

    for (let i = 0; i < offset; i++) {
      const emptyCell = document.createElement("div");
      emptyCell.className = "cal-day-cell cal-empty";
      emptyCell.style.opacity = "0.2";
      this.calendarDaysGrid.appendChild(emptyCell);
    }

    for (let day = 1; day <= 31; day++) {
      const dateStr = `2026-10-${String(day).padStart(2, '0')}`;
      const dayTasks = this.tasks.filter(t => t.Date === dateStr);
      const total = dayTasks.length;
      const completed = dayTasks.filter(t => t.Checklist_Done === true || t.Checklist_Done === "true").length;

      const cell = document.createElement("div");
      cell.className = "cal-day-cell";
      if (dateStr === this.selectedDate) {
        cell.classList.add("active");
      }
      if (total > 0) {
        cell.classList.add("has-tasks");
      }

      let badgeIcon = "";
      if (total > 0 && completed === total) {
        badgeIcon = "✓";
      } else if (completed > 0) {
        badgeIcon = "⭐";
      }

      cell.innerHTML = `
        <span class="cal-day-num">${day}</span>
        ${badgeIcon ? `<span style="font-size: 10px; line-height: 1;">${badgeIcon}</span>` : ""}
      `;

      cell.addEventListener("click", () => {
        this.selectDate(dateStr);
        // Switch back to daily tab
        const dailyTabBtn = document.querySelector(`.tab-btn[data-tab="tab-daily"]`);
        if (dailyTabBtn) dailyTabBtn.click();
      });

      this.calendarDaysGrid.appendChild(cell);
    }
  }

  renderWaterCups() {
    if (!this.waterCups) return;
    this.waterCups.forEach((cup, idx) => {
      if (idx < this.waterCount) {
        cup.classList.add("active");
      } else {
        cup.classList.remove("active");
      }
    });
  }

  // ==========================================
  // SCHEDULE REMINDERS & CHIME ALARM
  // ==========================================
  playChimeSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Cute sparkle chime)
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.35);
      });
    } catch (e) {
      console.warn("Audio chime error:", e);
    }
  }

  triggerReminderAlarm(task) {
    this.playChimeSound();

    if (this.reminderAlertCard) {
      if (this.reminderAlertTitle) {
        this.reminderAlertTitle.textContent = `⏰ Nhắc việc: ${task.Title}`;
      }
      if (this.reminderAlertTime) {
        this.reminderAlertTime.textContent = `Giờ làm: ${task.Start_Time || ""} - ${task.End_Time || ""} (${task.Priority || ""})`;
      }
      this.reminderAlertCard.classList.add("show");
    }

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(`⏰ Nhắc lịch: ${task.Title}`, {
          body: `Thời gian: ${task.Start_Time || ""} - ${task.End_Time || ""}\nMức ưu tiên: ${task.Priority || ""}`,
          icon: "favicon.ico"
        });
      } catch (e) {
        console.warn("Notification error:", e);
      }
    }
  }

  startReminderChecker() {
    // Check every 30 seconds
    setInterval(() => {
      this.checkUpcomingReminders();
    }, 30000);

    // Initial check after 2 seconds
    setTimeout(() => {
      this.checkUpcomingReminders();
    }, 2000);
  }

  checkUpcomingReminders() {
    if (!this.remindersEnabled || !this.tasks || this.tasks.length === 0) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentDay = String(now.getDate()).padStart(2, '0');
    const todayStr = `${currentYear}-${currentMonth}-${currentDay}`;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    this.tasks.forEach(task => {
      // Check tasks matching today or selected date if in active preview
      if (task.Date !== todayStr && task.Date !== this.selectedDate) return;
      const isDone = task.Checklist_Done === true || task.Checklist_Done === "true";
      if (isDone) return;

      const reminderType = task.Reminder || "at_time";
      if (reminderType === "none") return;

      if (!task.Start_Time) return;
      const timeParts = task.Start_Time.split(":");
      const h = parseInt(timeParts[0], 10);
      const m = parseInt(timeParts[1], 10);
      if (isNaN(h) || isNaN(m)) return;

      const taskMinutes = h * 60 + m;
      let triggerMinutes = taskMinutes;
      if (reminderType === "before_5m") triggerMinutes -= 5;
      if (reminderType === "before_15m") triggerMinutes -= 15;

      const reminderKey = `${task.ID}_${task.Date}_${triggerMinutes}`;
      if (!this.triggeredReminders.has(reminderKey)) {
        if (currentMinutes >= triggerMinutes && currentMinutes <= triggerMinutes + 5) {
          this.triggeredReminders.add(reminderKey);
          this.triggerReminderAlarm(task);
        }
      }
    });
  }
}

// Start app on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  window.app = new StarnestPlannerApp();
});
