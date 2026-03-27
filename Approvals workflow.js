function processConditionsUpdates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // ==================== CONFIG ====================
  const FORM_SHEET_NAME   = "conditions update";
  const TARGET_SHEET_NAME = "clean data";
  
  const FORM_EMAIL_COL    = 3;   // C
  const FORM_APPROVAL_COL = 99;  // CU
  const FORM_RESULT_COL   = 100; // CV
  const FORM_FIRST_COND   = 4;   // D
  
  const TARGET_ID_COL         = 5;   // E
  const TARGET_FIRST_COND_COL = 63;   // D ← change only this if your target range starts elsewhere
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

    // 🔥 POSITIONAL UPDATES (no header matching!)
    let rowUpdates = 0;
    const formCondStart = FORM_FIRST_COND - 1;

    for (let f = formCondStart; f < FORM_APPROVAL_COL - 1; f++) {
      const cellValue = (formData[i][f] || "").toString().trim();

      if (cellValue !== "") {
        const targetColIndex = TARGET_FIRST_COND_COL + (f - formCondStart);
        
        targetSheet
          .getRange(providerRowIndex, targetColIndex)
          .setValue(cellValue);

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
    ss.toast(
      `🎉 Updated ${updatedCount} cell${updatedCount === 1 ? '' : 's'}`,
      "Update Tool",
      6
    );
  } else {
    ss.toast("No rows processed", "Update Tool", 5);
  }
}


// =============================================================================
// Process Licensures Updates + Automatic Normalization
// =============================================================================
function processLicensuresUpdates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // ==================== CONFIG ====================
  const FORM_SHEET_NAME   = "licensure update";
  const TARGET_SHEET_NAME = "clean data";
  
  const FORM_EMAIL_COL    = 3;   // C
  const FORM_APPROVAL_COL = 55;  // CU
  const FORM_RESULT_COL   = 56;  // CV
  const FORM_FIRST_COND   = 4;   // D
  
  const TARGET_ID_COL         = 5;   // E (email match in clean data)
  const TARGET_FIRST_LICENSE_COL = 12;   // L = column 12 (first licensure column)
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

    // 🔥 POSITIONAL UPDATES (no header matching!)
    let rowUpdates = 0;
    const formCondStart = FORM_FIRST_COND - 1;

    for (let f = formCondStart; f < FORM_APPROVAL_COL - 1; f++) {
      const cellValue = (formData[i][f] || "").toString().trim();

      if (cellValue !== "") {
        const targetColIndex = TARGET_FIRST_LICENSE_COL + (f - formCondStart);
        
        targetSheet
          .getRange(providerRowIndex, targetColIndex)
          .setValue(cellValue);

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

  // Show update summary
  if (updatedCount > 0) {
    ss.toast(
      `🎉 Updated ${updatedCount} cell${updatedCount === 1 ? '' : 's'}`,
      "Update Tool",
      6
    );
  } else {
    ss.toast("No rows processed", "Update Tool", 5);
  }

  // ────────────────────────────────────────────────
  // Automatically normalize license statuses after updates
  // ────────────────────────────────────────────────
  normalizeLicenseStatus();
}

// =============================================================================
// Normalize License Status (called automatically from the function above)
// =============================================================================
function normalizeLicenseStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // ==================== CONFIG ====================
  const TARGET_SHEET_NAME     = "clean data";  // ← change to "clean data" when ready
  const FIRST_LICENSE_COL     = 12;   // L = column 12
  const LAST_LICENSE_COL      = 50;   // ← IMPORTANT: adjust to your actual last licensure column!
                                      //    Example: if last column is AA (27), set to 27
                                      //    If last is AZ (52), set to 52, etc.
  // =================================================

  const sheet = ss.getSheetByName(TARGET_SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert("❌ Sheet not found: " + TARGET_SHEET_NAME);
    return;
  }

  const lastCol = Math.min(sheet.getLastColumn(), LAST_LICENSE_COL);
  const numCols = lastCol - FIRST_LICENSE_COL + 1;
  
  if (numCols < 1) {
    SpreadsheetApp.getUi().alert("Invalid licensure column range");
    return;
  }

  const dataRange = sheet.getRange(2, FIRST_LICENSE_COL, sheet.getLastRow() - 1, numCols);
  const values = dataRange.getValues();

  let changes = 0;

  for (let row = 0; row < values.length; row++) {
    for (let col = 0; col < values[row].length; col++) {
      let val = (values[row][col] || "").toString().trim();
      
      if (!val) continue;

      let newVal = val;
      const lower = val.toLowerCase();

      if (lower === "license held") {
        newVal = "Active";
      } else if (lower === "license pending") {
        newVal = "Pending";
      }

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
  // No toast if no changes → keeps output clean when nothing to normalize
}


/// PROMPT TO MARK LICENSE EXPIRED 


function promptMarkLicenseExpired() {
  const ui = SpreadsheetApp.getUi();

  const stateResp = ui.prompt(
    "Mark License Expired",
    "Enter full state name (case insensitive):\n(e.g. Alabama, California, New York)",
    ui.ButtonSet.OK_CANCEL
  );
  if (stateResp.getSelectedButton() !== ui.Button.OK) return;
  const stateName = stateResp.getResponseText().trim();

  const emailResp = ui.prompt(
    "Mark License Expired",
    "Enter provider email:",
    ui.ButtonSet.OK_CANCEL
  );
  if (emailResp.getSelectedButton() !== ui.Button.OK) return;
  const email = emailResp.getResponseText().trim();

  markLicenseAsExpired(stateName, email);
}

//// MARK LICENSE EXPIRED 


function markLicenseAsExpired(stateName, email) {
  if (!stateName || !email) {
    SpreadsheetApp.getUi().alert("State name and email are required.");
    return;
  }

  const inputState = stateName.toLowerCase().trim();
  email = email.trim().toLowerCase();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cleanSheet = ss.getSheetByName('clean data');
  const conditionsSheet = ss.getSheetByName('Conditions');

  if (!cleanSheet || !conditionsSheet) {
    SpreadsheetApp.getUi().alert("Sheet 'clean data' or 'Conditions' not found.");
    return;
  }

  // 1. Read the ordered state names from G5:G55
  const stateRange = conditionsSheet.getRange("G5:G55");
  const stateValues = stateRange.getValues().flat().map(v => v ? v.toString().trim() : "");

  // Remove any empty/trailing entries
  const states = stateValues.filter(v => v !== "");

  if (states.length === 0) {
    SpreadsheetApp.getUi().alert("No state names found in Conditions!G5:G55");
    return;
  }

  // 2. Find the matching state (case-insensitive)
  let stateIndex = -1;
  for (let i = 0; i < states.length; i++) {
    if (states[i].toLowerCase() === inputState) {
      stateIndex = i;
      break;
    }
  }

  if (stateIndex === -1) {
    SpreadsheetApp.getUi().alert(`State "${stateName}" not found in Conditions!G5:G55`);
    return;
  }

  // 3. Calculate target column in 'clean data'
  // L = 12 → Alabama (index 0) → column 12
  // M = 13 → Alaska (index 1) → column 13
  const targetColumn = 12 + stateIndex;

  // 4. Find provider row by email (column E = 5)
  const lastRow = cleanSheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("No data in 'clean data'");
    return;
  }

  const emailCol = 5; // column E
  const emailValues = cleanSheet.getRange(2, emailCol, lastRow - 1, 1).getValues().flat();

  let targetRow = -1;
  for (let i = 0; i < emailValues.length; i++) {
    const cellEmail = (emailValues[i] || "").toString().trim().toLowerCase();
    if (cellEmail === email) {
      targetRow = i + 2; // +2 because we started from row 2
      break;
    }
  }

  if (targetRow === -1) {
    SpreadsheetApp.getUi().alert(`Provider email not found: ${email}`);
    return;
  }

  // 5. Set "EXPIRED" in the exact cell
  cleanSheet.getRange(targetRow, targetColumn).setValue("EXPIRED");

  SpreadsheetApp.getUi().alert(
    `Success: License marked as EXPIRED\n` +
    `Provider: ${email}\n` +
    `State: ${states[stateIndex]}\n` +
    `Cell: row ${targetRow}, column ${targetColumn}`
  );

  // Optional: log for audit
  console.log(`EXPIRED set: row ${targetRow}, col ${targetColumn}, state ${states[stateIndex]}, email ${email}`);
}



function addActiveStatesToProvidersHealthprof() {

  /// Prints the active states, two digit format, comma separated into the G column of 'Providers Bio' 
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const sourceSheet = ss.getSheetByName("clean data");
  const targetSheet = ss.getSheetByName("Providers Bio");

  if (!sourceSheet || !targetSheet) {
    Logger.log("One or both sheets not found: 'clean data' or 'Providers Bio'");
    return;
  }

  // ==================== CONFIG ====================
  const STATE_START_COL = 12;     // Column L
  const STATE_END_COL   = 62;     // Column BJ
  const KEY_COL_SOURCE  = 0;      // Column E (email) - change if using ID in column A
  // ================================================

  // State name → 2-letter code map
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

  // Get state headers
  const headerRange = sourceSheet.getRange(1, STATE_START_COL, 1, STATE_END_COL - STATE_START_COL + 1);
  const stateHeaders = headerRange.getValues()[0];

  const stateColumns = [];
  for (let i = 0; i < stateHeaders.length; i++) {
    const header = stateHeaders[i].toString().trim();
    const match = header.match(/State Licensure \[(.*?)\]/i);
    if (match) {
      const stateName = match[1].trim();
      const stateCode = stateToCode[stateName];
      if (stateCode) {
        stateColumns.push({
          colIndex: STATE_START_COL + i,
          stateCode: stateCode
        });
      }
    }
  }

  if (stateColumns.length === 0) {
    Logger.log("No valid State Licensure columns found");
    return;
  }

  const sourceData = sourceSheet.getDataRange().getValues();
  const activeStatesMap = {};

  for (let row = 1; row < sourceData.length; row++) {
    const keyValue = sourceData[row][KEY_COL_SOURCE]?.toString().trim();
    if (!keyValue) continue;

    const activeCodes = [];
    for (const stateCol of stateColumns) {
      const status = sourceData[row][stateCol.colIndex - 1]?.toString().trim().toLowerCase();
      if (status === "active" || status === "active - telehealth" || status === "license held") {
        if (!noLicenseRequired.has(stateCol.stateCode)) {
          activeCodes.push(stateCol.stateCode);
        }
      }
    }

    activeCodes.sort();
    activeStatesMap[keyValue] = activeCodes.length > 0 ? activeCodes.join(", ") : "";
  }

  // Write to 'Providers Bio' - Column F (column 6)
  const targetData = targetSheet.getDataRange().getValues();
  const targetKeyCol = 0;        // Column A

  const lastTargetRow = targetSheet.getLastRow();
  if (lastTargetRow >= 3) {
    targetSheet.getRange(3, 9, lastTargetRow - 2, 1).clearContent();   // Clear column Ifrom row 3 down
  }

  let updatesCount = 0;
  for (let row = 1; row < targetData.length; row++) {
    const keyValue = targetData[row][targetKeyCol]?.toString().trim();
    if (keyValue && activeStatesMap.hasOwnProperty(keyValue)) {
      targetSheet.getRange(row + 1, 9).setValue(activeStatesMap[keyValue]); // Column I = 9
      updatesCount++;
    }
  }

  SpreadsheetApp.flush();

  // Safe toast (only works if run manually)
  try {
    SpreadsheetApp.getUi().toast(`Updated active states for ${updatesCount} providers`, "Success", 5);
  } catch (e) {
    // This runs when triggered automatically - use Logger instead
    Logger.log(`Updated active states for ${updatesCount} providers in column G`);
  }

  Logger.log(`Finished - Updated ${updatesCount} rows`);
}