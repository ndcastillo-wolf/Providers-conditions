// ============================================================
// utils.js
// Responsibility: Shared debug helpers and one-off utilities
// ============================================================

function debugLastRows() {
  const ss         = SpreadsheetApp.getActiveSpreadsheet();
  const cleanSheet = ss.getSheetByName('clean data');
  const lastRow    = cleanSheet.getLastRow();
  const realLast   = cleanSheet.getDataRange().getLastRow();

  console.log(`getLastRow()      = ${lastRow}`);
  console.log(`getDataRange last = ${realLast}`);

  if (lastRow >= 2) {
    const tail = cleanSheet.getRange(Math.max(2, lastRow - 4), 1, 5, 1).getValues().flat();
    console.log("Last 5 cells in column A:", tail);
  }
}
