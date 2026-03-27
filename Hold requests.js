function processHoldRequests() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // ==================== CONFIG ====================
  const FORM_SHEET_NAME   = "Hold requests";
  const TARGET_SHEET_NAME = "clean data";
  
  const FORM_EMAIL_COL      = 3;   // C
  const FORM_START_DATE_COL = 4;   // D (currently not used in output, but kept for future)
  const FORM_END_DATE_COL   = 5;   // E ← "due date" of the hold
  const FORM_REASON_COL     = 6;   // F (optional - can be added to text if you want)
  
  const FORM_APPROVAL_COL = 7;   // G  ← Put "APPROVED" here 
  const FORM_RESULT_COL   = 8;   // H ← Result/status column
  
  const TARGET_ID_COL           = 5;   // E (email match column in clean data)
  const TARGET_AVAILABILITY_COL = 175; // FS
  // =================================================

  const formSheet = ss.getSheetByName(FORM_SHEET_NAME);
  const targetSheet = ss.getSheetByName(TARGET_SHEET_NAME);

  if (!formSheet || !targetSheet) {
    SpreadsheetApp.getUi().alert("❌ Sheet not found!");
    return;
  }

  const formData = formSheet.getDataRange().getValues();
  const targetData = targetSheet.getDataRange().getValues();

  let updatedCount = 0;

  for (let i = 1; i < formData.length; i++) {
    const row = i + 1;

    const approval = (formData[i][FORM_APPROVAL_COL - 1] || "")
      .toString().trim().toUpperCase();

    const result = (formData[i][FORM_RESULT_COL - 1] || "").toString().trim();

    // ✅ Only process valid rows
    if (approval !== "APPROVED" || result !== "") continue;

    const email = formData[i][FORM_EMAIL_COL - 1];

    if (!email) {
      formSheet.getRange(row, FORM_RESULT_COL).setValue("❌ Missing email");
      continue;
    }

    // Find provider row once
    let providerRowIndex = -1;
    for (let j = 1; j < targetData.length; j++) {
      if (targetData[j][TARGET_ID_COL - 1] == email) {
        providerRowIndex = j + 1;
        break;
      }
    }

    if (providerRowIndex === -1) {
      formSheet.getRange(row, FORM_RESULT_COL).setValue("❌ ID not found");
      continue;
    }

    // Build the hold text using End Date
    const endDateRaw = formData[i][FORM_END_DATE_COL - 1];
    if (!endDateRaw) {
      formSheet.getRange(row, FORM_RESULT_COL).setValue("❌ Missing End Date");
      continue;
    }

    const endDate = new Date(endDateRaw);
    const formattedDate = Utilities.formatDate(
      endDate, 
      Session.getScriptTimeZone(), 
      "M/d/yyyy"
    );

    const holdText = `HOLD until ${formattedDate}`;

    // Optional: add reason (uncomment if you want it)
    // const reason = (formData[i][FORM_REASON_COL - 1] || "").toString().trim();
    // const holdText = reason ? `Hold until ${formattedDate} - ${reason}` : `Hold until ${formattedDate}`;

    targetSheet
      .getRange(providerRowIndex, TARGET_AVAILABILITY_COL)
      .setValue(holdText);

    formSheet.getRange(row, FORM_RESULT_COL).setValue("✅ DONE");
    updatedCount++;
  }

  if (updatedCount > 0) {
    ss.toast(
      `🎉 Updated ${updatedCount} hold request${updatedCount === 1 ? '' : 's'}`,
      "Hold Requests Tool",
      6
    );
  } else {
    ss.toast("No rows processed", "Hold Requests Tool", 5);
  }
}