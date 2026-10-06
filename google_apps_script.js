/**
 * =========================================================================
 * GOOGLE APPS SCRIPT - ĐỒNG BỘ 2 CHIỀU & TỰ ĐỘNG GỬI EMAIL NHẮC LỊCH 24/7
 * =========================================================================
 * 
 * Hướng dẫn cài đặt nhanh (1 phút):
 * 1. Mở Google Sheet: https://docs.google.com/spreadsheets/d/17m8vSgdCiKNq15dPWtOq96sRnh3bssvHsnA3OzSnLBE/edit
 * 2. Vào menu: Tiện ích mở rộng (Extensions) -> Apps Script
 * 3. Xóa toàn bộ code cũ trong file Code.gs, dán 100% nội dung file này vào
 * 4. Nhấn nút "Triển khai" (Deploy) -> "Tùy chọn triển khai mới" (New deployment)
 *    - Loại: "Ứng dụng web" (Web App)
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me)
 *    - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone)
 * 5. Nhấn "Triển khai" và cấp quyền cho phép gửi Email (MailApp).
 * 6. Để tự động nhận mail mỗi sáng lúc 07:00:
 *    - Tại giao diện Apps Script, chọn hàm "installDailyEmailTrigger" ở thanh trên cùng và bấm nút "Chạy" (Run) 1 lần duy nhất!
 *    - Hoặc bấm nút "Chạy" hàm "testSendEmailNow" để nhận ngay email thử nghiệm!
 */

var SHEET_NAME = "CONG_VIEC_HANG_NGAY";
var DEFAULT_EMAIL = "nguyenthanhtrongnhan14@gmail.com";
var LIVE_APP_URL = "https://bombeodeptrai.github.io/starnest-daily-planner/";

// ==========================================
// API GET: LẤY DANH SÁCH CÔNG VIỆC
// ==========================================
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";
  
  // Cho phép test gửi mail bằng URL GET: ?action=send_email
  if (action === "send_email") {
    var emailParam = (e.parameter.email) ? e.parameter.email : DEFAULT_EMAIL;
    var result = sendDailyEmailReminder(emailParam);
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false, 
      error: "Không tìm thấy tab " + SHEET_NAME
    })).setMimeType(ContentService.MimeType.JSON);
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true, 
      data: [], 
      total: 0
    })).setMimeType(ContentService.MimeType.JSON);
  }

  var headers = data[0];
  var tasks = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var header = headers[j];
      var val = row[j];
      if (header === "Checklist_Done") {
        val = (val === true || String(val).toLowerCase() === "true" || val === 1);
      }
      obj[header] = val;
    }
    tasks.push(obj);
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: tasks,
    total: tasks.length
  })).setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// API POST: GHI DỮ LIỆU & GỬI EMAIL NHẮC LỊCH
// ==========================================
function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  try {
    var body = e.postData.contents;
    var payload = JSON.parse(body);
    var action = payload.action;

    // Action A: Gửi email nhắc lịch ngay lập tức
    if (action === "send_email_now" || action === "test_email") {
      var recipient = payload.email || DEFAULT_EMAIL;
      var dateTarget = payload.date || "";
      var emailRes = sendDailyEmailReminder(recipient, dateTarget);
      return ContentService.createTextOutput(JSON.stringify(emailRes)).setMimeType(ContentService.MimeType.JSON);
    }

    // Action B: Kích hoạt bộ hẹn giờ gửi mail 07:00 sáng tự động
    if (action === "setup_email_trigger") {
      installDailyEmailTrigger();
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Đã cài đặt bộ hẹn giờ gửi mail tự động lúc 07:00 mỗi sáng!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Action 1: Ghi đè toàn bộ danh sách (Bulk Sync)
    if (action === "sync_all" || Array.isArray(payload.tasks)) {
      var tasks = payload.tasks || [];
      if (tasks.length > 0) {
        var headers = ["ID", "Title", "Date", "Start_Time", "End_Time", "Session", "Day_Of_Week", "Status", "Checklist_Done", "Priority", "Category", "Reminder", "Notes"];
        var rows = [headers];

        for (var i = 0; i < tasks.length; i++) {
          var t = tasks[i];
          rows.push([
            t.ID || ("TASK_" + (1000 + i + 1)),
            t.Title || "",
            t.Date || "",
            t.Start_Time || "",
            t.End_Time || "",
            t.Session || "",
            t.Day_Of_Week || "",
            t.Checklist_Done ? "✅ Hoàn thành" : "⏳ Chưa hoàn thành",
            t.Checklist_Done ? true : false,
            t.Priority || "",
            t.Category || "",
            t.Reminder || "at_time",
            t.Notes || ""
          ]);
        }

        sheet.clearContents();
        sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);

        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Đã lưu " + tasks.length + " việc lên Google Sheet!",
          total: tasks.length
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Action 2: Toggle trạng thái 1 việc
    if (action === "toggle") {
      var taskId = payload.id;
      var data = sheet.getDataRange().getValues();
      var idColIdx = 0;
      var doneColIdx = 8;
      var statusColIdx = 7;

      for (var r = 1; r < data.length; r++) {
        if (data[r][idColIdx] === taskId) {
          var currentVal = data[r][doneColIdx];
          var newVal = !currentVal;
          sheet.getRange(r + 1, doneColIdx + 1).setValue(newVal);
          sheet.getRange(r + 1, statusColIdx + 1).setValue(newVal ? "✅ Hoàn thành" : "⏳ Chưa hoàn thành");
          return ContentService.createTextOutput(JSON.stringify({
            success: true,
            message: "Đã cập nhật trạng thái " + taskId,
            completed: newVal
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // Action 3: Thêm công việc mới
    if (action === "add") {
      var t = payload.task;
      var newRow = [
        t.ID || ("TASK_" + Date.now()),
        t.Title || "",
        t.Date || "",
        t.Start_Time || "",
        t.End_Time || "",
        t.Session || "",
        t.Day_Of_Week || "",
        "⏳ Chưa hoàn thành",
        false,
        t.Priority || "",
        t.Category || "",
        t.Reminder || "at_time",
        t.Notes || ""
      ];
      sheet.appendRow(newRow);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Đã thêm công việc mới",
        task: t
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Đã ghi nhận yêu cầu"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// HÀM GỬI EMAIL NHẮC LỊCH CHUYÊN NGHIỆP
// ==========================================
function sendDailyEmailReminder(targetEmail, targetDateStr) {
  var recipient = targetEmail || DEFAULT_EMAIL;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    return { success: false, error: "Không tìm thấy sheet " + SHEET_NAME };
  }

  var today = new Date();
  var dateStr = targetDateStr;
  if (!dateStr) {
    var y = today.getFullYear();
    var m = Utilities.formatString("%02d", today.getMonth() + 1);
    var d = Utilities.formatString("%02d", today.getDate());
    dateStr = y + "-" + m + "-" + d;
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: false, error: "Dữ liệu Google Sheet trống!" };
  }

  var headers = data[0];
  var colId = headers.indexOf("ID");
  var colTitle = headers.indexOf("Title");
  var colDate = headers.indexOf("Date");
  var colStart = headers.indexOf("Start_Time");
  var colEnd = headers.indexOf("End_Time");
  var colSession = headers.indexOf("Session");
  var colDone = headers.indexOf("Checklist_Done");
  var colPriority = headers.indexOf("Priority");
  var colCategory = headers.indexOf("Category");
  var colNotes = headers.indexOf("Notes");

  var tasksToday = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    var rDate = String(r[colDate]).trim();
    if (rDate === dateStr) {
      tasksToday.push({
        title: r[colTitle],
        start: r[colStart],
        end: r[colEnd],
        session: r[colSession] || "🌅 Buổi Sáng",
        done: (r[colDone] === true || String(r[colDone]).toLowerCase() === "true" || r[colDone] === 1),
        priority: r[colPriority] || "",
        category: r[colCategory] || "",
        notes: r[colNotes] || ""
      });
    }
  }

  var totalCount = tasksToday.length;
  var completedCount = tasksToday.filter(function(t) { return t.done; }).length;
  var percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  var parts = dateStr.split("-");
  var displayDate = parts[2] + "/" + parts[1] + "/" + parts[0];

  // Phân chia theo buổi
  var morningList = tasksToday.filter(function(t) { return t.session.indexOf("Sáng") !== -1; });
  var afternoonList = tasksToday.filter(function(t) { return t.session.indexOf("Chiều") !== -1; });
  var eveningList = tasksToday.filter(function(t) { return t.session.indexOf("Tối") !== -1; });

  function renderTaskListHtml(list) {
    if (list.length === 0) {
      return '<p style="color: #888; font-style: italic; font-size: 13px; margin: 4px 0 10px 0;">(Chưa có công việc được xếp)</p>';
    }
    var html = '<table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">';
    for (var k = 0; k < list.length; k++) {
      var t = list[k];
      var checkIcon = t.done ? '✅' : '⚪';
      var textStyle = t.done ? 'text-decoration: line-through; color: #888;' : 'font-weight: 600; color: #333;';
      html += '<tr style="border-bottom: 1px solid #f0f0f0;">';
      html += '  <td style="padding: 8px 6px; width: 24px; font-size: 16px;">' + checkIcon + '</td>';
      html += '  <td style="padding: 8px 6px; ' + textStyle + ' font-size: 14px;">' + t.title + '<br><span style="font-size: 11px; color: #ff758f; font-weight: 700;">⏰ ' + t.start + ' - ' + t.end + '</span> <span style="font-size: 11px; background: #fff0f3; color: #ff4d6d; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">' + t.category + '</span> <span style="font-size: 11px; color: #ffa200;">' + t.priority + '</span></td>';
      html += '</tr>';
    }
    html += '</table>';
    return html;
  }

  // TẠO GIAO DIỆN EMAIL HTML CUTE & CHUYÊN NGHIỆP
  var htmlEmail = '<div style="font-family: \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #ffe5ec; box-shadow: 0 4px 20px rgba(255, 117, 143, 0.15);">'
    + '  <div style="background: linear-gradient(135deg, #ff758f, #ffb3c1); padding: 24px 20px; text-align: center; color: #ffffff;">'
    + '    <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">🌸 KIỂU VIỆT DAILY PLANNER</h1>'
    + '    <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.95;">Thông Báo & Nhắc Lịch Làm Việc Ngày ' + displayDate + '</p>'
    + '  </div>'
    + '  <div style="padding: 20px;">'
    + '    <div style="background: #fff0f3; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; border-left: 5px solid #ff4d6d;">'
    + '      <div>'
    + '        <div style="font-size: 13px; color: #666;">Tiến độ hôm nay:</div>'
    + '        <div style="font-size: 18px; font-weight: 800; color: #ff4d6d;">' + completedCount + '/' + totalCount + ' công việc (' + percent + '%)</div>'
    + '      </div>'
    + '      <div style="font-size: 12px; color: #555; text-align: right;">'
    + '        ' + (percent === 100 ? '🎉 Đã hoàn thành 100%!' : '💪 Cố gắng hoàn thành mục tiêu!')
    + '      </div>'
    + '    </div>'
    + '    <h3 style="color: #ff4d6d; font-size: 15px; margin: 16px 0 8px 0; border-bottom: 2px solid #ffe5ec; padding-bottom: 4px;">🌅 BUỔI SÁNG (' + morningList.length + ' việc)</h3>'
    +      renderTaskListHtml(morningList)
    + '    <h3 style="color: #ff4d6d; font-size: 15px; margin: 16px 0 8px 0; border-bottom: 2px solid #ffe5ec; padding-bottom: 4px;">🌇 BUỔI CHIỀU (' + afternoonList.length + ' việc)</h3>'
    +      renderTaskListHtml(afternoonList)
    + (eveningList.length > 0 ? ('<h3 style="color: #ff4d6d; font-size: 15px; margin: 16px 0 8px 0; border-bottom: 2px solid #ffe5ec; padding-bottom: 4px;">🌙 BUỔI TỐI (' + eveningList.length + ' việc)</h3>' + renderTaskListHtml(eveningList)) : '')
    + '    <div style="text-align: center; margin: 24px 0 10px 0;">'
    + '      <a href="' + LIVE_APP_URL + '" style="background: linear-gradient(135deg, #ff758f, #ff4d6d); color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 25px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(255, 77, 109, 0.3);">✨ Mở Ứng Dụng Tra Cứu & Đánh Dấu Checklist</a>'
    + '    </div>'
    + '  </div>'
    + '  <div style="background: #fafafa; padding: 12px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #f0f0f0;">'
    + '    Email tự động gửi từ hệ thống Lập Kế Hoạch Kiểu Việt • Dữ liệu đồng bộ trực tiếp với Google Sheet'
    + '  </div>'
    + '</div>';

  var subject = "🌸 [Kiểu Việt Planner] Lịch làm việc ngày " + displayDate + " (" + totalCount + " việc)";

  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    htmlBody: htmlEmail
  });

  return {
    success: true,
    recipient: recipient,
    date: dateStr,
    total_tasks: totalCount,
    message: "Đã gửi email nhắc lịch ngày " + displayDate + " tới " + recipient + " thành công!"
  };
}

// ==========================================
// HÀM TEST GỬI EMAIL NGAY LẬP TỨC TRONG APPS SCRIPT
// ==========================================
function testSendEmailNow() {
  var res = sendDailyEmailReminder(DEFAULT_EMAIL);
  Logger.log(JSON.stringify(res));
  return res;
}

// ==========================================
// CÀI ĐẶT BỘ HẸN GIỜ GỬI MAIL 07:00 SÁNG HÀNG NGÀY
// ==========================================
function installDailyEmailTrigger() {
  // Xóa các trigger cũ trùng lặp
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "sendDailyEmailReminder") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Tạo trigger gửi mỗi sáng trong khung giờ 07:00 - 08:00
  ScriptApp.newTrigger("sendDailyEmailReminder")
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();

  Logger.log("Đã kích hoạt hẹn giờ gửi mail lúc 07:00 hàng ngày tới " + DEFAULT_EMAIL);
}
