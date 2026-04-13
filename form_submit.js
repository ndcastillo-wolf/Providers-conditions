// ============================================================
// form_submit.js
// Responsibility: Form submission trigger and historical backfill
// ============================================================

// ── Live trigger ─────────────────────────────────────────────

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

  const named = e.namedValues || {};

  const headers = targetSheet.getRange(1, 1, 1, targetSheet.getLastColumn()).getValues()[0];
  function getTargetCol(headerName) {
    const cleanName = headerName.trim().toLowerCase();
    const idx = headers.findIndex(h => h.trim().toLowerCase() === cleanName);
    return idx !== -1 ? idx + 1 : null;
  }

  let newRow = new Array(headers.length).fill("");

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
    "Languages Spoken (No encontrado)": named["Languages comfortable counseling in."] ? named["Languages comfortable counseling in."][0] : ""
  };

  Object.entries(fieldMap).forEach(([targetHeader, value]) => {
    const col = getTargetCol(targetHeader);
    if (col) newRow[col - 1] = value || "";
  });

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
      newRow[idx] = named[header] ? named[header][0] : "";
    }
  });

  const email = fieldMap["email"].trim().toLowerCase();
  if (email) {
    const existingEmails = targetSheet.getRange(2, getTargetCol("email "), targetSheet.getLastRow() - 1, 1).getValues().flat().map(em => em.toString().trim().toLowerCase());
    if (existingEmails.includes(email)) {
      Logger.log(`Skipping duplicate email: ${email}`);
      return;
    }
  }

  const tsCol = getTargetCol("Entry Timestamp");
  const srcCol = getTargetCol("Entry Source");
  if (tsCol) newRow[tsCol - 1] = new Date().toISOString();
  if (srcCol) newRow[srcCol - 1] = "Form";

  const nextRow = targetSheet.getLastRow() + 1;
  targetSheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);
  Logger.log(`Appended new row ${nextRow} for email: ${email}`);
}

// Run once manually to install the trigger
function installTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("onFormSubmit")
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onFormSubmit()
    .create();
}

// ── Historical backfill ──────────────────────────────────────

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

  const headers = targetSheet
    .getRange(1, 1, 1, targetSheet.getLastColumn())
    .getValues()[0];

  function normalize(str) {
    return (str || "")
      .toString()
      .toLowerCase()
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getTargetCol(headerName) {
    const clean = normalize(headerName);
    const idx = headers.findIndex(h => normalize(h) === clean);
    return idx !== -1 ? idx + 1 : null;
  }

  // Build form header → column index map from the responses sheet row 1.
  // This lets us look up any Clean Data header by name instead of counting positions.
  const formHeaders = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
  const formHeaderIndex = {};
  formHeaders.forEach((h, i) => {
    const key = normalize(h);
    if (key) formHeaderIndex[key] = i;
  });

  const noLicenseRequiredStates = new Set([
    "Alaska", "Arizona", "California", "Colorado", "Connecticut", "Hawaii", "Idaho",
    "Indiana", "Massachusetts", "Michigan", "New Hampshire", "New Jersey", "New York",
    "Oklahoma", "Oregon", "Pennsylvania", "Texas", "Utah", "Virginia", "Vermont",
    "Washington", "Wisconsin", "West Virginia", "Wyoming"
  ]);

  // Exact clean-data headers whose values come from an identically-named form header.
  const exactHeaders = new Set([
    "Time Zone",
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    "Any days/times that need to be blocked off in the first 60 days?",
    "About (2-3 sentences)",
    "Approach to Care (2-3 sentences)",
    "What to Expect in Our First Session (2-3 sentences)",
    "Education (1 sentence)",
    "Hobbies/Interests (1-2 sentences)"
  ]);

  // Clean-data header → actual form header (different wording in the form).
  const headerAliases = {
    "years of experience": "Years of experience",
    "discovery calls":     "Are you willing to conduct 15-minute discovery calls?",
    "Medicare":            "Are you part of Medicare?"
  };

  let nextId = 1;
  const idValues = targetSheet
    .getRange(2, 1, Math.max(1, targetSheet.getLastRow() - 1), 1)
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
  const availabilityCol = COL.AVAILABILITY;

  sourceData.forEach((response, index) => {
    const emailColIndex = getTargetCol("email");

    const email = (response[5] || "").toString().trim().toLowerCase();

    if (email && emailColIndex) {
      const existingEmails = targetSheet
        .getRange(2, emailColIndex, targetSheet.getLastRow() - 1, 1)
        .getValues()
        .flat()
        .map(e => (e || "").toString().trim().toLowerCase());

      if (existingEmails.includes(email)) {
        Logger.log(`Skipping duplicate email (row ${index + 2}): ${email}`);
        skippedCount++;
        return;
      }
    }

    const thisId = nextId;
    assignedIds.push(thisId);
    nextId++;

    let newRow = new Array(headers.length).fill("");
    newRow[0] = thisId;

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

    let startDate = response[9];
    Logger.log("RAW startDate: " + startDate);

    if (availabilityCol && startDate !== null && startDate !== undefined && startDate !== "") {
      if (startDate instanceof Date) {
        startDate = Utilities.formatDate(startDate, Session.getScriptTimeZone(), "MM/dd/yyyy");
      } else {
        startDate = startDate.toString().trim();
      }
      if (startDate) {
        newRow[availabilityCol - 1] = `STARTS - ${startDate}`;
      }
    }

    // Name-based mapping for all patterned + fixed-header columns.
    // Mirrors onFormSubmit — immune to form reordering or new questions added anywhere.
    headers.forEach((header, targetIdx) => {
      if (targetIdx === availabilityCol - 1) return;

      const isPatternHeader =
        header.startsWith("State Licensure [") ||
        header.startsWith("Ages Seen [")       ||
        header.startsWith("Conditions Seen [") ||
        header.startsWith("Approaches [");

      const isExactHeader = exactHeaders.has(header);
      const aliasFormHeader = headerAliases[header];

      if (!isPatternHeader && !isExactHeader && !aliasFormHeader) return;

      // Resolve which form header to read from.
      const lookupKey = aliasFormHeader ? normalize(aliasFormHeader) : normalize(header);
      const formIdx = formHeaderIndex[lookupKey];
      let value = formIdx !== undefined ? (response[formIdx] || "").toString().trim() : "";

      // For states with no license requirement, fill the default if the form left it blank
      if (!value && header.startsWith("State Licensure [")) {
        const match = header.match(/\[(.+?)\]/);
        const stateName = match ? match[1].trim() : "";
        if (noLicenseRequiredStates.has(stateName)) value = "No license needed";
      }

      newRow[targetIdx] = value;
    });

    const tsCol = getTargetCol("Entry Timestamp");
    const srcCol = getTargetCol("Entry Source");
    if (tsCol) newRow[tsCol - 1] = response[0] || new Date().toISOString();
    if (srcCol) newRow[srcCol - 1] = "Form (backfilled)";

    rowsToAdd.push(newRow);
  });

  if (rowsToAdd.length > 0) {
    let appendRow = targetSheet.getLastRow() + 1;

    const emailCol = getTargetCol("email");
    if (emailCol) {
      const emailCheck = targetSheet
        .getRange(1, emailCol, targetSheet.getLastRow(), 1)
        .getValues()
        .flat();

      const lastReal = emailCheck.lastIndexOf("") === -1
        ? emailCheck.length
        : emailCheck.lastIndexOf("") + 1;

      appendRow = Math.max(appendRow, lastReal + 1);
    }

    targetSheet
      .getRange(appendRow, 1, rowsToAdd.length, rowsToAdd[0].length)
      .setValues(rowsToAdd);

    Logger.log(`Added ${rowsToAdd.length} rows at ${appendRow}–${appendRow + rowsToAdd.length - 1}`);

    ss.toast(
      `Added ${rowsToAdd.length} new provider${rowsToAdd.length === 1 ? "" : "s"}`,
      "Success",
      6
    );
  } else {
    ss.toast(
      `No new providers added (${skippedCount} duplicates skipped)`,
      "Nothing to do",
      5
    );
  }
}
