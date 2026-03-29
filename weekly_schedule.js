function getWeeklyAvailability() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const cleanSheet = ss.getSheetByName('clean data');
  const providersSheet = ss.getSheetByName('providers bio');

  if (!cleanSheet || !providersSheet) {
    console.error("❌ Faltan hojas requeridas: 'clean data' o 'providers bio'");
    return;
  }

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // ====================== 1. Detectar última fila de forma robusta ======================
  const emailCol = 5;           // Columna E (Email) - ancla principal
  const availabilityLastCol = 90; // Columna FI (última de disponibilidad)

  let lastRow = getLastRowWithData(cleanSheet, emailCol);
  const lastRowByAvailability = getLastRowWithData(cleanSheet, availabilityLastCol);

  // Tomamos la fila más grande para no perder datos de disponibilidad
  lastRow = Math.max(lastRow, lastRowByAvailability);

  if (lastRow < 2) {
    console.warn("⚠️ No se encontraron datos en la hoja 'clean data'");
    return;
  }

  console.log(`✅ Procesando disponibilidad semanal de filas 2 a ${lastRow} (${lastRow - 1} proveedores)`);

  // ====================== 2. Obtener datos del rango FC:FI ======================
  const firstCol = 84;   // FC = columna 84
  const numCols = 7;     // FC hasta FI = 7 columnas (Lunes a Domingo)

  const availabilityData = cleanSheet.getRange(2, firstCol, lastRow - 1, numCols).getValues();

  console.log(`📊 Leyendo ${availabilityData.length} filas × ${numCols} columnas (FC:FI)`);

  // ====================== 3. Procesar cada proveedor ======================
  const output = availabilityData.map(row => {
    const dayAvailability = [];

    row.forEach((cell, i) => {
      const times = normalizeTimeSlots(cell);
      if (times.length > 0) {
        const dayName = daysOfWeek[i];
        dayAvailability.push(`${dayName}(${times.join(', ')})`);
      }
    });

    return [dayAvailability.join(', ')];   // Columna E
  });

  // ====================== 4. Limpiar columna E antes de escribir ======================
  const lastRowProviders = providersSheet.getLastRow();
  if (lastRowProviders >= 2) {
    providersSheet.getRange(2, 5, lastRowProviders - 1, 1).clearContent();
  }

  // ====================== 5. Escribir resultados en columna E (desde fila 2) ======================
  providersSheet.getRange(2, 5, output.length, 1).setValues(output);

  console.log(`✅ Finalizado: Escritas ${output.length} filas en columna E de 'providers bio'`);
}

// ====================== FUNCIONES AUXILIARES ======================

/**
 * Normaliza los horarios y devuelve array limpio
 * Ejemplo: "8am - 9am, 9pm - 10pm" → ["8-9am", "9-10pm"]
 */
function normalizeTimeSlots(cell) {
  if (!cell) return [];

  const text = cell.toString().trim();
  if (text === '') return [];

  const slots = text.split(/[,;]/).map(slot => slot.trim());

  const cleanedSlots = [];

  for (let slot of slots) {
    if (!slot) continue;

    let cleaned = slot
      .replace(/\s*-\s*/g, '-')                    // Normaliza guiones
      .replace(/(\d)\s*(am|pm)/gi, '$1$2')         // Quita espacio antes de am/pm
      .replace(/(\d+):00(am|pm)/gi, '$1$2')        // 8:00am → 8am
      .trim();

    if (cleaned) cleanedSlots.push(cleaned);
  }

  return cleanedSlots;
}

/**
 * Detecta la última fila con datos reales en una columna específica
 */
function getLastRowWithData(sheet, column) {
  const maxRows = Math.min(sheet.getMaxRows(), 10000); // Límite seguro
  const values = sheet.getRange(2, column, maxRows - 1, 1).getValues().flat();

  for (let i = values.length - 1; i >= 0; i--) {
    const val = values[i];
    if (val != null && String(val).trim() !== '') {
      return i + 2;
    }
  }
  return 1;
}