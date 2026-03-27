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

  // ✅ Robust header matcher (FIXES YOUR ISSUE)
  function normalize(str) {
    return (str || "")
      .toString()
      .toLowerCase()
      .replace(/\u00A0/g, " ")   // remove hidden spaces
      .replace(/\s+/g, " ")      // collapse spaces
      .trim();
  }

  function getTargetCol(headerName) {
    const clean = normalize(headerName);
    const idx = headers.findIndex(h => normalize(h) === clean);
    return idx !== -1 ? idx + 1 : null;
  }

  // ─── States where no license is required ─────────────────────────────
  const noLicenseRequiredStates = new Set([
    "Alaska", "Arizona", "California", "Colorado", "Connecticut", "Hawaii", "Idaho",
    "Indiana", "Massachusetts", "Michigan", "New Hampshire", "New Jersey", "New York",
    "Oklahoma", "Oregon", "Pennsylvania", "Texas", "Utah", "Virginia", "Vermont",
    "Washington", "Wisconsin", "West Virginia", "Wyoming"
  ]);

  // ─── Find next ID ────────────────────────────────────────────────────
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

  sourceData.forEach((response, index) => {
    const emailColIndex = getTargetCol("email");
    const availabilityCol = 175; // Column FS

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

    // ─── Field mappings ────────────────────────────────────────────────
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

    // ─── Availability Status (FIXED + RELIABLE) ────────────────────────
    let startDate = response[9];

    Logger.log("RAW startDate: " + startDate);
    Logger.log("Availability column index: " + availabilityCol);

    if (availabilityCol && startDate !== null && startDate !== undefined && startDate !== "") {

      if (startDate instanceof Date) {
        startDate = Utilities.formatDate(
          startDate,
          Session.getScriptTimeZone(),
          "MM/dd/yyyy"
        );
      } else {
        startDate = startDate.toString().trim();
      }

      if (startDate) {
        newRow[availabilityCol - 1] = `STARTS - ${startDate}`;
      }
    }

    // ─── State Licensure ───────────────────────────────────────────────
    const firstStateCol = getTargetCol("State Licensure [Alabama]");
      if (firstStateCol) {
        for (let i = 0; i < headers.length - firstStateCol + 1; i++) {
    const targetIdx = firstStateCol - 1 + i;
    const srcIdx = 12 + i;

    let value = "";
    if (srcIdx < response.length) {
      value = (response[srcIdx] || "").toString().trim();
    }

    if (!value) {
      const header = headers[targetIdx];
      const match = header.match(/\[(.+?)\]/);
      const stateName = match ? match[1].trim() : "";

      if (noLicenseRequiredStates.has(stateName)) {
        value = "No license needed";
      }
    }

    // ✅ DO NOT overwrite availability status column
    if (targetIdx !== availabilityCol - 1) {
      newRow[targetIdx] = value;
    }1
  }
}

    // ─── Audit ─────────────────────────────────────────────────────────
    const tsCol = getTargetCol("Entry Timestamp");
    const srcCol = getTargetCol("Entry Source");

    if (tsCol) newRow[tsCol - 1] = response[0] || new Date().toISOString();
    if (srcCol) newRow[srcCol - 1] = "Form (backfilled)";

    rowsToAdd.push(newRow);
  });

  // ─── Append rows ─────────────────────────────────────────────────────
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

    Logger.log(
      `Added ${rowsToAdd.length} rows at ${appendRow}–${appendRow + rowsToAdd.length - 1}`
    );

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