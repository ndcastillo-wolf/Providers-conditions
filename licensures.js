// ============================================================
// licensures.js
// Responsibility: Licensure updates, normalization, expiry, active states
// ============================================================

// ── Update licensures from form sheet → clean data ───────────

function processLicensuresUpdates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const FORM_SHEET_NAME   = "licensure update";
  const TARGET_SHEET_NAME = "clean data";

  const FORM_EMAIL_COL    = 3;  // C
  const FORM_APPROVAL_COL = 55; // BC
  const FORM_RESULT_COL   = 56; // BD
  const FORM_FIRST_COND   = 4;  // D

  const TARGET_ID_COL             = 5;  // E
  const TARGET_FIRST_LICENSE_COL  = COL.LICENSE_START;

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

    let rowUpdates = 0;
    const formCondStart = FORM_FIRST_COND - 1;

    for (let f = formCondStart; f < FORM_APPROVAL_COL - 1; f++) {
      const cellValue = (formData[i][f] || "").toString().trim();
      if (cellValue !== "") {
        const targetColIndex = TARGET_FIRST_LICENSE_COL + (f - formCondStart);
        targetSheet.getRange(providerRowIndex, targetColIndex).setValue(cellValue);
        rowUpdates++;
      }
    }

    if (rowUpdates > 0) {
      formSheet.getRange(row, FORM_RESULT_COL).setValue("✅ DONE");
      updatedCount += rowUpdates;
    } else {
      formSheet.getRange(row, FORM_RESULT_COL).setValue("⚠️ No conditions found");
    }
  }

  if (updatedCount > 0) {
    ss.toast(`🎉 Updated ${updatedCount} cell${updatedCount === 1 ? '' : 's'}`, "Update Tool", 6);
  } else {
    ss.toast("No rows processed", "Update Tool", 5);
  }

  normalizeLicenseStatus();
}

// ── Normalize license status values ─────────────────────────

function normalizeLicenseStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const TARGET_SHEET_NAME  = "clean data";
  const FIRST_LICENSE_COL  = COL.LICENSE_START;
  const LAST_LICENSE_COL   = COL.LICENSE_END;

  const sheet = ss.getSheetByName(TARGET_SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert("❌ Sheet not found: " + TARGET_SHEET_NAME);
    return;
  }

  const lastCol  = Math.min(sheet.getLastColumn(), LAST_LICENSE_COL);
  const numCols  = lastCol - FIRST_LICENSE_COL + 1;

  if (numCols < 1) {
    SpreadsheetApp.getUi().alert("Invalid licensure column range");
    return;
  }

  const dataRange = sheet.getRange(2, FIRST_LICENSE_COL, sheet.getLastRow() - 1, numCols);
  const values    = dataRange.getValues();

  let changes = 0;

  for (let row = 0; row < values.length; row++) {
    for (let col = 0; col < values[row].length; col++) {
      const val   = (values[row][col] || "").toString().trim();
      if (!val) continue;

      const lower = val.toLowerCase();
      let newVal  = val;

      if (lower === "license held")    newVal = "Active";
      else if (lower === "license pending") newVal = "Pending";

      if (newVal !== val) {
        values[row][col] = newVal;
        changes++;
      }
    }
  }

  if (changes > 0) {
    dataRange.setValues(values);
    ss.toast(`Normalized ${changes} license status entr${changes === 1 ? 'y' : 'ies'}`, "Normalization Done", 5);
  }
}

// ── Mark license status (Active / EXPIRED / REQUESTED) ───────

function promptMarkLicenseStatus() {
  const ui = SpreadsheetApp.getUi();

  // Step 1: state(s)
  const stateResp = ui.prompt(
    "Mark License Status — Step 1 of 3",
    "Enter state name(s), comma-separated for multiple:\n(e.g.  California  or  California, Colorado, Kentucky)",
    ui.ButtonSet.OK_CANCEL
  );
  if (stateResp.getSelectedButton() !== ui.Button.OK) return;
  const statesInput = stateResp.getResponseText().trim();
  if (!statesInput) { ui.alert("No state entered. Nothing done."); return; }

  // Step 2: status
  const statusResp = ui.prompt(
    "Mark License Status — Step 2 of 3",
    "Enter the new status:\n  1 → Active\n  2 → EXPIRED\n  3 → REQUESTED",
    ui.ButtonSet.OK_CANCEL
  );
  if (statusResp.getSelectedButton() !== ui.Button.OK) return;
  const statusInput = statusResp.getResponseText().trim();

  const VALID_STATUSES = { '1': 'Active', '2': 'EXPIRED', '3': 'REQUESTED',
                           'active': 'Active', 'expired': 'EXPIRED', 'requested': 'REQUESTED' };
  const status = VALID_STATUSES[statusInput.toLowerCase()];

  if (!status) {
    ui.alert(`Invalid status: "${statusInput}"\nEnter 1, 2, 3 or type Active / EXPIRED / REQUESTED`);
    return;
  }

  // Step 3: email
  const emailResp = ui.prompt(
    "Mark License Status — Step 3 of 3",
    "Enter provider email:",
    ui.ButtonSet.OK_CANCEL
  );
  if (emailResp.getSelectedButton() !== ui.Button.OK) return;
  const email = emailResp.getResponseText().trim();
  if (!email) { ui.alert("No email entered. Nothing done."); return; }

  const stateNames = statesInput.split(',').map(s => s.trim()).filter(Boolean);
  markLicenseStatus(stateNames, status, email);
}

function markLicenseStatus(stateNames, status, email) {
  const ss         = SpreadsheetApp.getActiveSpreadsheet();
  const cleanSheet = ss.getSheetByName('clean data');
  const condSheet  = ss.getSheetByName('Conditions');

  if (!cleanSheet || !condSheet) {
    SpreadsheetApp.getUi().alert("Sheet 'clean data' or 'Conditions' not found.");
    return;
  }

  // Load state name list from Conditions sheet
  const states = condSheet.getRange("G5:G55").getValues().flat()
    .map(v => (v || "").toString().trim())
    .filter(Boolean);

  if (states.length === 0) {
    SpreadsheetApp.getUi().alert("No state names found in Conditions!G5:G55");
    return;
  }

  // Find provider row by email
  const lastRow     = cleanSheet.getLastRow();
  const emailValues = cleanSheet.getRange(2, COL.EMAIL, lastRow - 1, 1).getValues().flat();
  const providerIdx = emailValues.findIndex(e => (e || "").toString().trim().toLowerCase() === email.trim().toLowerCase());

  if (providerIdx === -1) {
    SpreadsheetApp.getUi().alert(`Provider email not found: ${email}`);
    return;
  }

  const targetRow = providerIdx + 2; // +2: header row + 0-based index

  // Apply status to each requested state
  const applied  = [];
  const notFound = [];

  stateNames.forEach(stateName => {
    const stateIndex = states.findIndex(s => s.toLowerCase() === stateName.toLowerCase().trim());

    if (stateIndex === -1) {
      notFound.push(stateName);
      return;
    }

    const targetCol = COL.LICENSE_START + stateIndex;
    cleanSheet.getRange(targetRow, targetCol).setValue(status);
    applied.push(states[stateIndex]);
    console.log(`${status} set: row ${targetRow}, col ${targetCol}, state ${states[stateIndex]}, email ${email}`);
  });

  // Summary alert
  let msg = "";
  if (applied.length > 0)  msg += `✅ Set to ${status}:\n${applied.join(', ')}\n\nProvider: ${email}`;
  if (notFound.length > 0) msg += `\n\n⚠️ States not found (check spelling):\n${notFound.join(', ')}`;
  SpreadsheetApp.getUi().alert(msg || "Nothing was updated.");
}

// ── Write active states to providers bio ────────────────────

function addActiveStatesToProvidersHealthprof() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sourceSheet = ss.getSheetByName("clean data");
  const targetSheet = ss.getSheetByName("Providers Bio");

  if (!sourceSheet || !targetSheet) {
    Logger.log("One or both sheets not found: 'clean data' or 'Providers Bio'");
    return;
  }

  const STATE_START_COL = COL.LICENSE_START;
  const STATE_END_COL   = COL.LICENSE_END;

  const stateToCode = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
    "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "District of Columbia": "DC",
    "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL",
    "Indiana": "IN", "Iowa": "IA", "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA",
    "Maine": "ME", "Maryland": "MD", "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN",
    "Mississippi": "MS", "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
    "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
    "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK", "Oregon": "OR",
    "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD",
    "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT", "Virginia": "VA",
    "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY"
  };

  const noLicenseRequired = new Set([
    "AK", "AZ", "CA", "CO", "CT", "HI", "ID", "IN", "MA", "MI", "NH", "NJ", "NY",
    "OK", "OR", "PA", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY"
  ]);

  const stateHeaders = sourceSheet
    .getRange(1, STATE_START_COL, 1, STATE_END_COL - STATE_START_COL + 1)
    .getValues()[0];

  const stateColumns = [];
  stateHeaders.forEach((header, i) => {
    const match = header.toString().trim().match(/State Licensure \[(.*?)\]/i);
    if (match) {
      const stateCode = stateToCode[match[1].trim()];
      if (stateCode) stateColumns.push({ colIndex: STATE_START_COL + i, stateCode });
    }
  });

  if (stateColumns.length === 0) {
    Logger.log("No valid State Licensure columns found");
    return;
  }

  const sourceData     = sourceSheet.getDataRange().getValues();
  const activeStatesMap = {};

  for (let row = 1; row < sourceData.length; row++) {
    const keyValue = sourceData[row][0]?.toString().trim(); // column A
    if (!keyValue) continue;

    const activeCodes = [];
    for (const stateCol of stateColumns) {
      const status = sourceData[row][stateCol.colIndex - 1]?.toString().trim().toLowerCase();
      if ((status === "active" || status === "active - telehealth" || status === "license held")
          && !noLicenseRequired.has(stateCol.stateCode)) {
        activeCodes.push(stateCol.stateCode);
      }
    }

    activeCodes.sort();
    activeStatesMap[keyValue] = activeCodes.length > 0 ? activeCodes.join(", ") : "";
  }

  const targetData    = targetSheet.getDataRange().getValues();
  const lastTargetRow = targetSheet.getLastRow();

  if (lastTargetRow >= 3) {
    targetSheet.getRange(3, BIO_COL.ACTIVE_STATES, lastTargetRow - 2, 1).clearContent();
  }

  let updatesCount = 0;
  for (let row = 1; row < targetData.length; row++) {
    const keyValue = targetData[row][0]?.toString().trim(); // column A
    if (keyValue && activeStatesMap.hasOwnProperty(keyValue)) {
      targetSheet.getRange(row + 1, BIO_COL.ACTIVE_STATES).setValue(activeStatesMap[keyValue]);
      updatesCount++;
    }
  }

  SpreadsheetApp.flush();

  try {
    SpreadsheetApp.getUi().toast(`Updated active states for ${updatesCount} providers`, "Success", 5);
  } catch (e) {
    Logger.log(`Updated active states for ${updatesCount} providers`);
  }

  Logger.log(`Finished - Updated ${updatesCount} rows`);
}
