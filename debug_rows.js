function debugLastRows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cleanSheet = ss.getSheetByName('clean data');
  const lastRow = cleanSheet.getLastRow();
  const realLast = cleanSheet.getDataRange().getLastRow(); // more reliable for content

  console.log(`getLastRow()     = ${lastRow}`);
  console.log(`getDataRange last = ${realLast}`);

  // Peek at the last few rows
  if (lastRow >= 2) {
    const tail = cleanSheet.getRange(Math.max(2, lastRow - 4), 1, 5, 1).getValues().flat();
    console.log("Last 5 cells in column A:", tail);
  }
}