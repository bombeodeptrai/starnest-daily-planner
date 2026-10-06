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

    this.initElements();
    this.applyTheme(this.currentTheme);
    this.bindEvents();
    this.loadData();
  }

  initElements() {
    // Theme elements
    this.btnThemeToggle = document.getElementById("btnThemeToggle");
    this.themeMenu = document.getElementById("themeMenu");
    this.themeOptions = document.querySelectorAll(".theme-opt");

    // Header & Navigation
    this.btnSyncGsheet = document.getElementById("btnSyncGsheet");
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

    // Modal Add Task
    this.fabAddTask = document.getElementById("fabAddTask");
    this.modalBackdrop = document.getElementById("modalBackdrop");
    this.btnCloseModal = document.getElementById("btnCloseModal");
    this.btnCancelModal = document.getElementById("btnCancelModal");
    this.addPlanForm = document.getElementById("addPlanForm");
    this.inpTitle = document.getElementById("inpTitle");
    this.inpDate = document.getElementById("inpDate");
    this.inpSession = document.getElementById("inpSession");
    this.inpStartTime = document.getElementById("inpStartTime");
    this.inpEndTime = document.getElementById("inpEndTime");
    this.inpPriority = document.getElementById("inpPriority");
    this.inpCategory = document.getElementById("inpCategory");
    this.inpNotes = document.getElementById("inpNotes");

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
    try {
      const resp = await fetch("/api/tasks");
      if (resp.ok) {
        const json = await resp.json();
        this.tasks = json.data || [];
      } else {
        throw new Error("API response not ok");
      }
    } catch (e) {
      console.warn("Could not load from /api/tasks, trying local tasks_data.json:", e);
      try {
        const localResp = await fetch("tasks_data.json");
        this.tasks = await localResp.json();
      } catch (err) {
        console.error("Failed to load tasks_data.json:", err);
        const cached = localStorage.getItem("planner_tasks_cache");
        if (cached) {
          this.tasks = JSON.parse(cached);
        }
      }
    }

    if (this.tasks && this.tasks.length > 0) {
      localStorage.setItem("planner_tasks_cache", JSON.stringify(this.tasks));
    }

    this.renderAll();
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
          </div>
        </div>
        <div class="task-actions">
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

    // Send API update
    try {
      await fetch("/api/tasks/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId })
      });
      this.showToast(task.Checklist_Done ? "Đã xong: " + task.Title : "Đã chuyển về chưa xong", task.Checklist_Done ? "💖" : "⏳");
    } catch (err) {
      console.warn("Toggle sync failed:", err);
    }
  }

  async deleteTask(taskId) {
    const task = this.tasks.find(t => t.ID === taskId);
    const title = task ? task.Title : "công việc";
    this.tasks = this.tasks.filter(t => t.ID !== taskId);

    this.renderDailyRoutine();
    this.renderMonthCalendar();
    this.renderDateStrip();
    localStorage.setItem("planner_tasks_cache", JSON.stringify(this.tasks));

    try {
      await fetch("/api/tasks/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId })
      });
      this.showToast(`Đã xóa: ${title}`, "🗑️");
    } catch (err) {
      console.warn("Delete API failed:", err);
    }
  }

  openAddModal() {
    if (!this.modalBackdrop) return;
    this.inpDate.value = this.selectedDate;
    this.inpTitle.value = "";
    this.inpNotes.value = "";
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

    const taskPayload = {
      title: title,
      date: dateVal,
      session: this.inpSession.value,
      start_time: this.inpStartTime.value || "08:00",
      end_time: this.inpEndTime.value || "09:00",
      day_of_week: dow,
      priority: this.inpPriority.value,
      category: this.inpCategory.value,
      notes: this.inpNotes.value.trim()
    };

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
        // Fallback local addition
        const fallbackTask = {
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
          Notes: taskPayload.notes
        };
        this.tasks.push(fallbackTask);
      }
    } catch (err) {
      console.warn("Add task API failed, adding locally:", err);
      const fallbackTask = {
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
        Notes: taskPayload.notes
      };
      this.tasks.push(fallbackTask);
    }

    localStorage.setItem("planner_tasks_cache", JSON.stringify(this.tasks));
    this.closeAddModal();
    this.selectDate(dateVal);
    this.showToast("Đã lưu kế hoạch mới thành công! 💖", "🌸");
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
}

// Start app on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  window.app = new StarnestPlannerApp();
});
