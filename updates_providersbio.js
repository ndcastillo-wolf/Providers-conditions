function generateConditionsToProvidersBio() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const cleanSheet = ss.getSheetByName('clean data');
  const providersSheet = ss.getSheetByName('providers bio');
  const conditionsSheet = ss.getSheetByName('Conditions');

  if (!cleanSheet || !providersSheet || !conditionsSheet) {
    SpreadsheetApp.getUi().alert("Faltan hojas requeridas: 'clean data', 'providers bio' o 'Conditions'");
    return;
  }

  // Obtener labels de condiciones (A2:A91)
  const labelsRange = conditionsSheet.getRange('A2:A91');
  const labels = labelsRange.getValues().flat().map(label => label.toString().trim());

  // Calcular última fila real usando columna E (Email) como anchor
  const lastRow = getLastRowWithData_(cleanSheet, 5); // columna E = 5

  if (lastRow < 2) {
    console.log("No se encontraron datos en 'clean data'");
    return;
  }

  console.log(`Procesando filas 2 a ${lastRow} (${lastRow - 1} proveedores)`);

  // ==================== AJUSTA ESTOS VALORES SI ES NECESARIO ====================
  const firstConditionCol = 68;   // Columna BP (68)
  const numConditionCols = 90;    // Cantidad de columnas de condiciones (verifica que sea correcto)

  // Leer solo hasta la última fila real
  const data = cleanSheet.getRange(2, firstConditionCol, lastRow - 1, numConditionCols).getValues();

  // Procesar cada fila
  const output = [];

  for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    let specialties = [];
    let ableWilling = [];

    for (let i = 0; i < row.length; i++) {
      const value = (row[i] || '').toString().trim().toLowerCase();
      const label = labels[i] || "";

      if (!label) continue;

      if (value === "specialty") {
        specialties.push(label);
      } else if (value === "able/willing to see") {
        ableWilling.push(label);
      }
    }

    output.push([
      specialties.join(', '),     // Columna K (Specialties)
      ableWilling.join(', ')      // Columna L (Able/Willing to see)
    ]);
  }

  // Escribir en la hoja 'providers bio' (columnas K=11 y L=12, empezando en fila 3)
  if (output.length > 0) {
    providersSheet.getRange(3, 11, output.length, 2).setValues(output);
    console.log(`✅ Escrito correctamente ${output.length} filas en columnas K y L`);
  } else {
    console.log("No se generaron datos de condiciones");
  }
}

/** Helper: Obtiene la última fila con datos en una columna específica */
function getLastRowWithData_(sheet, column) {
  const maxRows = sheet.getMaxRows();
  const values = sheet.getRange(2, column, maxRows - 1, 1).getValues().flat();
  
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] !== '' && values[i] != null) {
      return i + 2;
    }
  }
  return 1;
}