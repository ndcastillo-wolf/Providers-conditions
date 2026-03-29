function generateConditionsToProvidersBio() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const cleanSheet = ss.getSheetByName('clean data');
  const providersSheet = ss.getSheetByName('providers bio');
  const conditionsSheet = ss.getSheetByName('Conditions');

  if (!cleanSheet || !providersSheet || !conditionsSheet) {
    console.log("Missing required sheet");
    return;
  }

  // Get condition labels (90 rows)
  const labels = conditionsSheet.getRange('A2:A91').getValues().flat();

  // Get real last row safely (using email column E=5 as anchor)
  const emailCol = 5;
  const maxRows = cleanSheet.getMaxRows();
  const emailValues = cleanSheet.getRange(2, emailCol, maxRows - 1, 1).getValues().flat();

  let lastRow = 1;
  for (let i = emailValues.length - 1; i >= 0; i--) {
    if (emailValues[i] !== '' && emailValues[i] != null) {
      lastRow = i + 2;
      break;
    }
  }

  if (lastRow < 2) {
    console.log("No data found in clean data");
    return;
  }

  console.log(`Processing rows 2 to ${lastRow}`);

  // Get data from BP to FA (adjust columns if needed)
  const firstCol = 68; // BP = column 68
  const numCols = 90;  // BP to FA ≈ 38 columns (adjust if different)
  const data = cleanSheet.getRange(2, firstCol, lastRow - 1, numCols).getValues();

  // Process each provider row
  const output = data.map(row => {
    let specialties = [];
    let ableWilling = [];

    row.forEach((cell, i) => {
      const value = (cell || '').toString().trim().toLowerCase();
      const label = labels[i] || "";

      if (!label) return;

      if (value === "specialty") {
        specialties.push(label);
      } else if (value === "able/willing to see") {
        ableWilling.push(label);
      }
    });

    return [
      specialties.join(', '),   // K: Specialties
      ableWilling.join(', ')    // L: Able/Willing to see
    ];
  });

  // Remove trailing empty rows
  while (output.length > 0 && output[output.length - 1].every(v => v === '')) {
    output.pop();
  }

  if (output.length === 0) {
    console.log("No conditions found");
    return;
  }

  console.log(`Writing ${output.length} rows to K & L`);

  // Write to K (11) and L (12), starting row 3
  providersSheet.getRange(3, 11, output.length, 2).setValues(output);
}