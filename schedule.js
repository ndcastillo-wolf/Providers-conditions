// ============================================================
// schedule.js
// Responsibility: Weekly availability parsing and formatting
// ============================================================

function getWeeklyAvailability() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const cleanSheet     = ss.getSheetByName('clean data');
  const providersSheet = ss.getSheetByName('providers bio');

  if (!cleanSheet || !providersSheet) {
    console.error("❌ Faltan hojas requeridas");
    return;
  }

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const cleanData  = cleanSheet.getDataRange().getValues();
  if (cleanData.length < 2) return;

  // Resolve day-of-week columns by header name so we're immune to column shifts.
  // Falls back to COL.SCHEDULE_START + offset if a header isn't found.
  const headers = cleanData[0];
  const normalize = (s) => (s || "").toString().toLowerCase().replace(/\s+/g, " ").trim();

  const dayColIndex = daysOfWeek.map((day, i) => {
    const target = normalize(day);
    const idx = headers.findIndex(h => normalize(h) === target);
    if (idx === -1) {
      console.warn(`⚠️ Header "${day}" not found in 'clean data'; falling back to positional column ${COL.SCHEDULE_START + i}`);
      return COL.SCHEDULE_START - 1 + i;  // 0-indexed fallback
    }
    return idx;
  });

  // Build providerId → formatted schedule map (ID = column A, mirrors addActiveStatesToProvidersHealthprof).
  const scheduleMap = {};
  for (let row = 1; row < cleanData.length; row++) {
    const providerId = (cleanData[row][0] || "").toString().trim();
    if (!providerId) continue;

    const dayAvailability = [];
    dayColIndex.forEach((colIdx, dayNum) => {
      const times = normalizeTimeSlots(cleanData[row][colIdx]);
      if (times.length > 0) {
        dayAvailability.push(`${daysOfWeek[dayNum]}(${times.join(', ')})`);
        console.log(`   → ID ${providerId} | ${daysOfWeek[dayNum]}: ${times.join(', ')}`);
      }
    });

    scheduleMap[providerId] = dayAvailability.join(', ');
  }

  // Clear existing column E values in providers bio, then write by matching column A (ID).
  const providersData    = providersSheet.getDataRange().getValues();
  const providersLastRow = providersSheet.getLastRow();

  if (providersLastRow >= 3) {
    providersSheet.getRange(3, BIO_COL.WEEKLY_AVAIL, providersLastRow - 2, 1).clearContent();
  }

  let writes = 0;
  const missing = [];

  for (let row = 2; row < providersData.length; row++) {  // providers bio data starts at row 3 (index 2)
    const providerId = (providersData[row][0] || "").toString().trim();
    if (!providerId) continue;

    if (Object.prototype.hasOwnProperty.call(scheduleMap, providerId)) {
      providersSheet.getRange(row + 1, BIO_COL.WEEKLY_AVAIL).setValue(scheduleMap[providerId]);
      writes++;
    } else {
      missing.push(providerId);
    }
  }

  SpreadsheetApp.flush();

  if (missing.length > 0) {
    console.warn(`⚠️ ${missing.length} provider(s) in 'providers bio' had no matching ID in 'clean data': ${missing.join(", ")}`);
  }
  console.log(`✅ Wrote weekly availability for ${writes} provider(s) to column E of 'providers bio'`);
}

function normalizeTimeSlots(cell) {
  if (!cell) return [];

  const text = cell.toString().trim();
  if (text === '') return [];

  return text.split(/[,;]/).map(slot =>
    slot.trim()
      .replace(/\s*-\s*/g, '-')
      .replace(/(\d)\s*(am|pm)/gi, '$1$2')
      .replace(/(\d+):00(am|pm)/gi, '$1$2')
  ).filter(slot => slot.length > 0);
}
