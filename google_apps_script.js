/**
 * =========================================================================
 * GOOGLE APPS SCRIPT - API ĐỒNG BỘ 2 CHIỀU CHO WEB APP LẬP KẾ HOẠCH
 * =========================================================================
 * 
 * Hướng dẫn cài đặt (30 giây):
 * 1. Mở Google Sheet: https://docs.google.com/spreadsheets/d/17m8vSgdCiKNq15dPWtOq96sRnh3bssvHsnA3OzSnLBE/edit
 * 2. Vào menu: Tiện ích mở rộng (Extensions) -> Apps Script
 * 3. Xóa code cũ, dán toàn bộ nội dung file này vào
 * 4. Nhấn nút "Triển khai" (Deploy) -> "Tùy chọn triển khai mới" (New deployment)
 * 5. Chọn loại: "Ứng dụng web" (Web App)
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me)
 *    - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone)
 * 6. Nhấn "Triển khai" và sao chép Web App URL (dạng https://script.google.com/macros/s/.../exec)
 * 7. Dán URL này vào nút "☁️ Lưu về Google Sheet" trên Web App GitHub Pages!
 */

var SHEET_NAME = "CONG_VIEC_HANG_NGAY";

function doGet(e) {
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

    // Action 1: Ghi đè toàn bộ danh sách (Bulk Sync)
    if (action === "sync_all" || Array.isArray(payload.tasks)) {
      var tasks = payload.tasks || [];
      if (tasks.length > 0) {
        var headers = ["ID", "Title", "Date", "Start_Time", "End_Time", "Session", "Day_Of_Week", "Status", "Checklist_Done", "Priority", "Category", "Notes"];
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
