// ============================================================
// schedule.js
// Responsibility: Weekly availability parsing and formatting
// ============================================================

function getWeeklyAvailability() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const cleanSheet    = ss.getSheetByName('clean data');
  const providersSheet = ss.getSheetByName('providers bio');

  if (!cleanSheet || !providersSheet) {
    console.error("❌ Faltan hojas requeridas");
    return;
  }

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const lastRow    = cleanSheet.getLastRow();
  const firstCol   = 159; // FC
  const numCols    = 7;   // FC:FI

  const availabilityData = cleanSheet.getRange(2, firstCol, lastRow - 1, numCols).getValues();

  const output = availabilityData.map((row, index) => {
    const dayAvailability = [];
    const rowNum = index + 2;

    row.forEach((cell, i) => {
      const times   = normalizeTimeSlots(cell);
      const dayName = daysOfWeek[i];

      if (times.length > 0) {
        dayAvailability.push(`${dayName}(${times.join(', ')})`);
        console.log(`   → Row ${rowNum} | ${dayName}: ${times.join(', ')}`);
      }
    });

    return [dayAvailability.join(', ')];
  });

  const providersLastRow = providersSheet.getLastRow();
  if (providersLastRow >= 2) {
    providersSheet.getRange(3, 5, providersLastRow - 1, 1).clearContent();
  }

  providersSheet.getRange(3, 5, output.length, 1).setValues(output);

  console.log(`✅ Wrote ${output.length} rows to column E of 'providers bio'`);
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
