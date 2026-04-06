// ============================================================
// holds.js
// Responsibility: All provider availability hold logic
// ============================================================

// ── Batch hold processing (from Hold requests sheet) ─────────

function processHoldRequests() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const FORM_SHEET_NAME   = "Hold requests";
  const TARGET_SHEET_NAME = "clean data";

  const FORM_EMAIL_COL      = 3;   // C
  const FORM_END_DATE_COL   = 5;   // E — due date of the hold
  const FORM_APPROVAL_COL   = 7;   // G — put "APPROVED" here
  const FORM_RESULT_COL     = 8;   // H — result/status column

  const TARGET_ID_COL           = 5;   // E (email match in clean data)
  const TARGET_AVAILABILITY_COL = 175; // FS

  const formSheet   = ss.getSheetByName(FORM_SHEET_NAME);
  const targetSheet = ss.getSheetByName(TARGET_SHEET_NAME);

  if (!formSheet || !targetSheet) {
    SpreadsheetApp.getUi().alert("❌ Sheet not found!");
    return;
  }

  const formData   = formSheet.getDataRange().getValues();
  const targetData = targetSheet.getDataRange().getValues();

  let updatedCount = 0;

  for (let i = 1; i < formData.length; i++) {
    const row      = i + 1;
    const approval = (formData[i][FORM_APPROVAL_COL - 1] || "").toString().trim().toUpperCase();
    const result   = (formData[i][FORM_RESULT_COL - 1] || "").toString().trim();

    if (approval !== "APPROVED" || result !== "") continue;

    const email = formData[i][FORM_EMAIL_COL - 1];

    if (!email) {
      formSheet.getRange(row, FORM_RESULT_COL).setValue("❌ Missing email");
      continue;
    }

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

    const endDateRaw = formData[i][FORM_END_DATE_COL - 1];
    if (!endDateRaw) {
      formSheet.getRange(row, FORM_RESULT_COL).setValue("❌ Missing End Date");
      continue;
    }

    const formattedDate = Utilities.formatDate(
      new Date(endDateRaw),
      Session.getScriptTimeZone(),
      "M/d/yyyy"
    );

    targetSheet.getRange(providerRowIndex, TARGET_AVAILABILITY_COL).setValue(`HOLD until ${formattedDate}`);
    formSheet.getRange(row, FORM_RESULT_COL).setValue("✅ DONE");
    updatedCount++;
  }

  if (updatedCount > 0) {
    ss.toast(`🎉 Updated ${updatedCount} hold request${updatedCount === 1 ? '' : 's'}`, "Hold Requests Tool", 6);
  } else {
    ss.toast("No rows processed", "Hold Requests Tool", 5);
  }
}

// ── Lift hold (set to OPEN) ──────────────────────────────────

function promptAndLiftHold() {
  const ui = SpreadsheetApp.getUi();

  const response = ui.prompt(
    'Lift Hold – Set to OPEN',
    'Enter the provider email exactly as in column E of "clean data":',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) return;

  const email = response.getResponseText().trim();
  if (!email) {
    ui.alert('No email entered. Nothing done.');
    return;
  }

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('clean data');

  if (!sheet) {
    ui.alert('Sheet "clean data" not found!');
    return;
  }

  const data       = sheet.getDataRange().getValues();
  const idColIndex = 5 - 1;   // column E, 0-based
  const statusCol  = 175;     // column FS

  let foundRow = -1;
  for (let i = 1; i < data.length; i++) {
    if ((data[i][idColIndex] || '').toString().trim() === email) {
      foundRow = i + 1;
      break;
    }
  }

  if (foundRow === -1) {
    ss.toast(`Email not found: ${email}`, 'Not found', 5);
    return;
  }

  sheet.getRange(foundRow, statusCol).setValue('OPEN');
  ss.toast(`Hold lifted → OPEN\n${email}`, 'Success', 5);
}

// ── Set indefinite hold ──────────────────────────────────────

function promptAndSetHold() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let ui = null;

  try {
    ui = SpreadsheetApp.getUi();
  } catch (e) {
    ss.toast("Cannot show prompt in this context. Run from menu.", "Info", 10);
    Logger.log("UI not available: " + e.message);
    return;
  }

  const response = ui.prompt(
    'Set to HOLD (Indefinite)',
    'Enter the provider email exactly as in column E of "clean data":',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) return;

  const email = response.getResponseText().trim();
  if (!email) {
    ui.alert('No email entered. Nothing done.');
    return;
  }

  performSetHold(ss, email, ui);
}

function performSetHold(ss, email, ui = null) {
  const sheet = ss.getSheetByName('clean data');

  if (!sheet) {
    const msg = 'Sheet "clean data" not found!';
    if (ui) ui.alert(msg);
    ss.toast(msg, 'Error', 5);
    return;
  }

  const data       = sheet.getDataRange().getValues();
  const idColIndex = 5 - 1;  // column E, 0-based
  const statusCol  = 175;    // column FS

  let foundRow = -1;
  for (let i = 1; i < data.length; i++) {
    if ((data[i][idColIndex] || '').toString().trim() === email) {
      foundRow = i + 1;
      break;
    }
  }

  if (foundRow === -1) {
    const msg = `Email not found: ${email}`;
    ss.toast(msg, 'Not found', 5);
    if (ui) ui.alert(msg);
    return;
  }

  sheet.getRange(foundRow, statusCol).setValue("HOLD undefined");

  const successMsg = `Status set to HOLD\n${email}`;
  ss.toast(successMsg, 'Success', 5);
  if (ui) ui.alert(successMsg);
}
