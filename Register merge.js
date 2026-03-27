// ===============================
// onFormSubmit - Auto-appends new form submission to "Clean Data"
// ===============

function onFormSubmit(e) {
  if (!e || (!e.values && !e.namedValues)) {
    Logger.log("Invalid event - no values or namedValues");
    return;
  }

  const props = PropertiesService.getScriptProperties();
  const key = 'last_form_submit_time';
  const now = new Date().getTime();
  const last = props.getProperty(key);
  if (last && now - parseInt(last) < 5000) {  // 5-second debounce for duplicates
    Logger.log("Duplicate / rapid re-trigger detected - skipping");
    return;
  }
  props.setProperty(key, now.toString());

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetSheet = ss.getSheetByName("Clean Data");
  if (!targetSheet) {
    Logger.log("Clean Data sheet not found");
    return;
  }

  const named = e.namedValues || {};  // Use namedValues for reliability

  // Get target headers
  const headers = targetSheet.getRange(1, 1, 1, targetSheet.getLastColumn()).getValues()[0];
  function getTargetCol(headerName) {
    const cleanName = headerName.trim().toLowerCase();
    const idx = headers.findIndex(h => h.trim().toLowerCase() === cleanName);
    return idx !== -1 ? idx + 1 : null;
  }

  let newRow = new Array(headers.length).fill("");

  // Explicit mapping using namedValues (question titles as keys)
  const fieldMap = {
    "Name": named["First/Last Name"] ? named["First/Last Name"][0] : "",
    "Credentials": named["Credentials"] ? named["Credentials"][0] : "",
    "NPI": named["NPI"] ? named["NPI"][0] : "",
    "years of experience": named["Years of experience"] ? named["Years of experience"][0] : "",
    "Medicare": named["Are you part of Medicare?"] ? named["Are you part of Medicare?"][0] : "",
    "discovery calls": named["Are you willing to conduct 15-minute discovery calls?"] ? named["Are you willing to conduct 15-minute discovery calls?"][0] : "",
    "email ": named["Healthloft Email Address"] ? named["Healthloft Email Address"][0] : "",
    "password": named["Healthloft Email Password"] ? named["Healthloft Email Password"][0] : "",
    "gender": named["Gender"] ? named["Gender"][0] : "",
    "pronouns": named["Pronouns"] ? named["Pronouns"][0] : "",
    "start date": named["Start Date"] ? named["Start Date"][0] : "",
    "Resides In ": named["State of Residence"] ? named["State of Residence"][0] : "",
    "Languages Spoken (No encontrado)": named["Languages comfortable counseling in."] ? named["Languages comfortable counseling in."][0] : ""  // Keeps comma-separated as one string
  };

  Object.entries(fieldMap).forEach(([targetHeader, value]) => {
    const col = getTargetCol(targetHeader);
    if (col) newRow[col - 1] = value || "";
  });

  // Direct copy for state licensure, ages, conditions, approaches, time zone, days, blocked times, bios
  // Matches headers exactly between form and target
  headers.forEach((header, idx) => {
    if (header.startsWith("State Licensure [") ||
        header.startsWith("Ages Seen [") ||
        header.startsWith("Conditions Seen [") ||
        header.startsWith("Approaches [") ||
        ["Time Zone", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
         "Any days/times that need to be blocked off in the first 60 days?",
         "About (2-3 sentences)", "Approach to Care (2-3 sentences)",
         "What to Expect in Our First Session (2-3 sentences)",
         "Education (1 sentence)", "Hobbies/Interests (1-2 sentences)"].includes(header)) {
      const formKey = header;  // Assumes exact match to form question titles
      newRow[idx] = named[formKey] ? named[formKey][0] : "";
    }
  });

  // Duplicate check: Skip if email already exists
  const email = fieldMap["email"].trim().toLowerCase();
  if (email) {
    const existingEmails = targetSheet.getRange(2, getTargetCol("email "), targetSheet.getLastRow() - 1, 1).getValues().flat().map(em => em.toString().trim().toLowerCase());
    if (existingEmails.includes(email)) {
      Logger.log(`Skipping duplicate email: ${email}`);
      return;
    }
  }

  // Audit columns (add these to your Clean Data header if missing)
  const tsCol = getTargetCol("Entry Timestamp");
  const srcCol = getTargetCol("Entry Source");
  if (tsCol) newRow[tsCol - 1] = new Date().toISOString();
  if (srcCol) newRow[srcCol - 1] = "Form";

  // Append the row
  const nextRow = targetSheet.getLastRow() + 1;
  targetSheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);
  Logger.log(`Appended new row ${nextRow} for email: ${email}`);
}

// Install trigger (run this once manually)
function installTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));  // Clean up any extras
  ScriptApp.newTrigger("onFormSubmit")
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onFormSubmit()
    .create();
}

// ================================================
// One-time backfill for existing form rows
// Run manually after testing
// ================================================

function backfillFormResponses() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName("New Hire Info Form");
  const targetSheet = ss.getSheetByName("Clean Data");
  if (!sourceSheet || !targetSheet) {
    SpreadsheetApp.getUi().alert("Missing sheet");
    return;
  }

  const sourceData = sourceSheet.getDataRange().getValues().slice(1);
  if (sourceData.length === 0) return;

  const headers = targetSheet.getRange(1, 1, 1, targetSheet.getLastColumn()).getValues()[0];
  
  function getTargetCol(headerName) {
    const clean = headerName.trim().toLowerCase();
    const idx = headers.findIndex(h => (h || "").toString().trim().toLowerCase() === clean);
    return idx !== -1 ? idx + 1 : null;
  }

  // ─── Find true next ID ───────────────────────────────────────────────
  let nextId = 1;
  const idValues = targetSheet.getRange(2, 1, Math.max(1, targetSheet.getLastRow() - 1), 1)
                               .getValues()
                               .flat()
                               .map(v => Number(v))
                               .filter(n => !isNaN(n) && n > 0);

  if (idValues.length > 0) {
    nextId = Math.max(...idValues) + 1;
  }

  Logger.log(`Calculated starting ID: ${nextId}`);

  const rowsToAdd = [];
  let assignedIds = [];
  let skippedCount = 0;

  sourceData.forEach((response, index) => {
    const email = (response[5] || "").toString().trim().toLowerCase();
    if (email) {
      // Check for existing email (case-insensitive)
      const existingEmails = targetSheet.getRange(2, getTargetCol("email") || 1, 
                                                  targetSheet.getLastRow() - 1, 1)
                                         .getValues()
                                         .flat()
                                         .map(e => (e || "").toString().trim().toLowerCase());
      if (existingEmails.includes(email)) {
        Logger.log(`Skipping duplicate email (row ${index+2} in source): ${email}`);
        skippedCount++;
        return;
      }
    }

    // If we reached here → we will add this row → assign ID now
    const thisId = nextId;
    assignedIds.push(thisId);
    nextId++;  // only increment when we actually plan to add

    let newRow = new Array(headers.length).fill("");

    newRow[0] = thisId;  // Column A = ID

    // Your original field mappings
    newRow[getTargetCol("Name") - 1] = response[2] || "";
    newRow[getTargetCol("Credentials") - 1] = response[3] || "";
    newRow[getTargetCol("NPI") - 1] = response[4] || "";
    newRow[getTargetCol("email") - 1] = response[5] || "";
    newRow[getTargetCol("password") - 1] = response[6] || "";
    newRow[getTargetCol("gender") - 1] = response[7] || "";
    newRow[getTargetCol("pronouns") - 1] = response[8] || "";
    newRow[getTargetCol("start date") - 1] = response[9] || "";
    newRow[getTargetCol("Resides In ") - 1] = response[10] || "";
    newRow[getTargetCol("Languages Spoken") - 1] = response[11] || "";

    const firstStateCol = getTargetCol("State Licensure [Alabama]");
    if (firstStateCol) {
      for (let i = 0; i < headers.length - firstStateCol + 1; i++) {
        const targetIdx = firstStateCol - 1 + i;
        const srcIdx = 12 + i;
        if (srcIdx < response.length) newRow[targetIdx] = response[srcIdx] || "";
      }
    }

    // Audit
    const tsCol = getTargetCol("Entry Timestamp");
    const srcCol = getTargetCol("Entry Source");
    if (tsCol) newRow[tsCol - 1] = response[0] || new Date().toISOString();
    if (srcCol) newRow[srcCol - 1] = "Form (backfilled)";

    rowsToAdd.push(newRow);
  });

  if (rowsToAdd.length > 0) {
    // Clean up getLastRow() issues: append right after real data
    let appendRow = targetSheet.getLastRow() + 1;
    
    // Safety: if getLastRow() is inflated, find real last row with data in col A or email
    const emailCol = getTargetCol("email");
    if (emailCol) {
      const emailCheck = targetSheet.getRange(1, emailCol, targetSheet.getLastRow(), 1).getValues().flat();
      const lastReal = emailCheck.lastIndexOf("") === -1 ? emailCheck.length : emailCheck.lastIndexOf("") + 1;
      appendRow = Math.max(appendRow, lastReal + 1);
    }

    targetSheet.getRange(appendRow, 1, rowsToAdd.length, rowsToAdd[0].length).setValues(rowsToAdd);
    
    const idRange = `A${appendRow}:A${appendRow + rowsToAdd.length - 1}`;
    Logger.log(`Added ${rowsToAdd.length} rows at rows ${appendRow}–${appendRow + rowsToAdd.length - 1} with IDs ${assignedIds.join(", ")}`);
    
    ss.toast(`Added ${rowsToAdd.length} new provider${rowsToAdd.length === 1 ? '' : 's'} (IDs ${assignedIds[0]}–${assignedIds[assignedIds.length-1]})`, "Success", 6);
  } else {
    ss.toast(`No new providers added (${skippedCount} duplicates skipped)`, "Nothing to do", 5);
  }
}