function generateConditionsToProvidersBio() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const cleanSheet = ss.getSheetByName('clean data');
  const providersSheet = ss.getSheetByName('providers bio');
  const conditionsSheet = ss.getSheetByName('Conditions');

  if (!cleanSheet || !providersSheet || !conditionsSheet) {
    console.error("❌ Faltan hojas requeridas: 'clean data', 'providers bio' o 'Conditions'");
    return;
  }

  // 1. Obtener labels de condiciones (A2:A91)
  const labels = conditionsSheet.getRange('A2:A91').getValues().flat().map(label => 
    (label || '').toString().trim()
  );

  // 2. Detectar última fila real usando columna Email (E = 5)
  const emailCol = 5; // Columna E
  const lastRowWithData = getLastRowWithData(cleanSheet, emailCol);

  if (lastRowWithData < 2) {
    console.warn("⚠️ No se encontró data en la hoja 'clean data'");
    return;
  }

  console.log(`✅ Procesando filas 2 a ${lastRowWithData} (${lastRowWithData - 1} proveedores)`);

  // 3. Obtener datos de las columnas BP a FA (ajusta si cambia)
  const firstCol = 68;   // BP = columna 68
  const numCols = 38;    // BP hasta FA ≈ 38 columnas

  const data = cleanSheet.getRange(2, firstCol, lastRowWithData - 1, numCols).getValues();

  // 4. Procesar cada fila (cada proveedor)
  const output = data.map((row, rowIndex) => {
    const specialties = new Set();   // Usamos Set para evitar duplicados
    const ableWilling = new Set();

    row.forEach((cell, i) => {
      const value = normalizeString(cell);
      const label = labels[i];

      if (!label) return;

      if (isSpecialty(value)) {
        specialties.add(label);
      } else if (isAbleWilling(value)) {
        ableWilling.add(label);
      }
    });

    // Opcional: ordenar alfabéticamente
    // const sortedSpecialties = Array.from(specialties).sort().join(', ');
    // const sortedAble = Array.from(ableWilling).sort().join(', ');

    return [
      Array.from(specialties).join(', '),     // Columna K
      Array.from(ableWilling).join(', ')      // Columna L
    ];
  });

  // 5. Eliminar filas completamente vacías al final
  while (output.length > 0 && output[output.length - 1].every(v => v === '')) {
    output.pop();
  }

  if (output.length === 0) {
    console.warn("⚠️ No se generaron condiciones");
    return;
  }

  // 6. Limpiar columnas K y L antes de escribir (evita datos residuales)
  const maxRowsProviders = providersSheet.getLastRow();
  if (maxRowsProviders >= 3) {
    providersSheet.getRange(3, 11, maxRowsProviders - 2, 2).clearContent(); // Limpia K y L desde fila 3
  }

  // 7. Escribir resultados
  providersSheet.getRange(3, 11, output.length, 2).setValues(output);

  console.log(`✅ Escritas ${output.length} filas en columnas K y L de 'providers bio'`);
}

// ====================== FUNCIONES AUXILIARES ======================

/**
 * Normaliza strings: trim + lowercase + quita espacios extra
 */
function normalizeString(value) {
  if (value == null) return '';
  return value.toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Detecta variaciones de "specialty"
 */
function isSpecialty(str) {
  const normalized = normalizeString(str);
  return normalized === 'specialty' || 
         normalized.includes('specialty');
}

/**
 * Detecta variaciones de "able/willing to see"
 */
function isAbleWilling(str) {
  const normalized = normalizeString(str);
  return normalized.includes('able') && 
         (normalized.includes('willing') || normalized.includes('will')) && 
         (normalized.includes('see') || normalized.includes('to see'));
}

/**
 * Obtiene la última fila con datos reales en una columna específica
 * (Más robusto que getLastRow())
 */
function getLastRowWithData(sheet, column) {
  const maxRows = sheet.getMaxRows();
  // Leemos desde fila 2 hasta el final
  const values = sheet.getRange(2, column, maxRows - 1, 1).getValues().flat();

  for (let i = values.length - 1; i >= 0; i--) {
    const cell = values[i];
    if (cell != null && 
        cell.toString().trim() !== '' && 
        cell !== false) {           // false por checkboxes
      return i + 2;                 // +2 porque empezamos en fila 2
    }
  }
  return 1; // No hay datos
}