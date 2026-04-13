// ============================================================
// conditions.js
// Responsibility: Process and propagate conditions/specialties data
// ============================================================

// ── Update conditions from form sheet → clean data ───────────

function processConditionsUpdates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const FORM_SHEET_NAME   = "conditions update";
  const TARGET_SHEET_NAME = "clean data";

  const FORM_EMAIL_COL    = 3;   // C
  const FORM_APPROVAL_COL = 99;  // CU
  const FORM_RESULT_COL   = 100; // CV
  const FORM_FIRST_COND   = 4;   // D

  const TARGET_ID_COL         = COL.EMAIL;  // E
  const TARGET_FIRST_COND_COL = COL.CONDITIONS_START;
  const TARGET_LAST_COND_COL  = COL.CONDITIONS_END;

  const formSheet   = ss.getSheetByName(FORM_SHEET_NAME);
  const targetSheet = ss.getSheetByName(TARGET_SHEET_NAME);

  if (!formSheet || !targetSheet) {
    SpreadsheetApp.getUi().alert("❌ Sheet not found!");
    return;
  }

  const formData   = formSheet.getDataRange().getValues();
  const targetData = targetSheet.getDataRange().getValues();

  // Name-based column mapping — immune to form/target reordering or differing column counts.
  // Mirrors the refactor applied to backfillFormResponses in form_submit.js.
  function normalize(str) {
    return (str || "")
      .toString()
      .toLowerCase()
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const formHeaders   = formData[0] || [];
  const targetHeaders = targetData[0] || [];

  // Build form-header → target-column map, restricted to the form's condition range
  // and the clean data sheet's condition range.
  const formToTargetCol = {};
  for (let f = FORM_FIRST_COND - 1; f < FORM_APPROVAL_COL - 1; f++) {
    const key = normalize(formHeaders[f]);
    if (!key) continue;
    for (let t = TARGET_FIRST_COND_COL - 1; t < TARGET_LAST_COND_COL; t++) {
      if (normalize(targetHeaders[t]) === key) {
        formToTargetCol[f] = t + 1;  // 1-indexed column
        break;
      }
    }
  }

  let updatedCount = 0;
  const unmatchedHeaders = new Set();

  for (let i = 1; i < formData.length; i++) {
    const row      = i + 1;
    const approval = (formData[i][FORM_APPROVAL_COL - 1] || "").toString().trim().toUpperCase();
    const result   = (formData[i][FORM_RESULT_COL - 1] || "").toString().trim();

    if (approval !== "APPROVED" || result !== "") continue;

    const email = formData[i][FORM_EMAIL_COL - 1];

    if (!email) {
      formSheet.getRange(row, FORM_RESULT_COL).setValue("❌ Missing email");
      continue;
    }

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

    let rowUpdates = 0;

    for (let f = FORM_FIRST_COND - 1; f < FORM_APPROVAL_COL - 1; f++) {
      const cellValue = (formData[i][f] || "").toString().trim();
      if (cellValue === "") continue;

      const targetCol = formToTargetCol[f];
      if (!targetCol) {
        const headerName = (formHeaders[f] || "").toString().trim();
        if (headerName) unmatchedHeaders.add(headerName);
        continue;
      }

      targetSheet.getRange(providerRowIndex, targetCol).setValue(cellValue);
      rowUpdates++;
    }

    if (rowUpdates > 0) {
      formSheet.getRange(row, FORM_RESULT_COL).setValue("✅ DONE");
      updatedCount += rowUpdates;
    } else {
      formSheet.getRange(row, FORM_RESULT_COL).setValue("⚠️ No conditions found");
    }
  }

  if (unmatchedHeaders.size > 0) {
    Logger.log(`⚠️ Unmatched form headers (no column in clean data): ${Array.from(unmatchedHeaders).join(" | ")}`);
  }

  if (updatedCount > 0) {
    ss.toast(`🎉 Updated ${updatedCount} cell${updatedCount === 1 ? '' : 's'}`, "Update Tool", 6);
  } else {
    ss.toast("No rows processed", "Update Tool", 5);
  }
}

// ── Generate specialties/conditions for providers bio ────────

function generateConditionsToProvidersBio() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const cleanSheet      = ss.getSheetByName('clean data');
  const providersSheet  = ss.getSheetByName('providers bio');
  const conditionsSheet = ss.getSheetByName('Conditions');

  if (!cleanSheet || !providersSheet || !conditionsSheet) {
    SpreadsheetApp.getUi().alert("Faltan hojas requeridas: 'clean data', 'providers bio' o 'Conditions'");
    return;
  }

  const labels = conditionsSheet.getRange('A2:A91').getValues().flat().map(label =>
    label.toString().trim()
  );

  const lastRow = getLastRowWithData_(cleanSheet, 5); // column E = email

  if (lastRow < 2) {
    console.log("No se encontraron datos en 'clean data'");
    return;
  }

  console.log(`Procesando filas 2 a ${lastRow} (${lastRow - 1} proveedores)`);

  const firstConditionCol = COL.CONDITIONS_START;
  const numConditionCols  = COL.CONDITIONS_COUNT;

  const data = cleanSheet.getRange(2, firstConditionCol, lastRow - 1, numConditionCols).getValues();

  const output = [];

  for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
    const row       = data[rowIdx];
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
      specialties.join(', '),
      ableWilling.join(', ')
    ]);
  }

  if (output.length > 0) {
    providersSheet.getRange(3, BIO_COL.SPECIALTIES, output.length, 2).setValues(output);
    console.log(`✅ Escrito correctamente ${output.length} filas en columnas K y L`);
  } else {
    console.log("No se generaron datos de condiciones");
  }
}

// ── Helper ───────────────────────────────────────────────────

function getLastRowWithData_(sheet, column) {
  const maxRows = sheet.getMaxRows();
  const values  = sheet.getRange(2, column, maxRows - 1, 1).getValues().flat();

  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] !== '' && values[i] != null) {
      return i + 2;
    }
  }
  return 1;
}
