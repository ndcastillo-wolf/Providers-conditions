function getWeeklyAvailability() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const cleanSheet = ss.getSheetByName('clean data');
  const providersSheet = ss.getSheetByName('providers bio');

  if (!cleanSheet || !providersSheet) {
    console.error("❌ Faltan hojas: 'clean data' o 'providers bio'");
    return;
  }

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // ====================== 1. Detectar última fila real ======================
  const emailCol = 5; // Columna E (Email) como ancla
  const lastRow = getLastRowWithData(cleanSheet, emailCol);

  if (lastRow < 2) {
    console.warn("⚠️ No hay datos en 'clean data'");
    return;
  }

  console.log(`✅ Procesando disponibilidad semanal de ${lastRow - 1} proveedores (filas 2 a ${lastRow})`);

  // ====================== 2. Obtener datos del rango FC:FI ======================
  // FC = columna 84, FI = columna 90  →  7 columnas
  const firstCol = 84;   // FC
  const numCols = 91;     // FC hasta FI

  const availabilityData = cleanSheet.getRange(2, firstCol, lastRow - 1, numCols).getValues();

  // ====================== 3. Procesar cada fila ======================
  const output = availabilityData.map(row => {
    const dayAvailability = [];

    row.forEach((cell, i) => {
      const times = normalizeTimeSlots(cell);
      if (times.length > 0) {
        const dayName = daysOfWeek[i];
        dayAvailability.push(`${dayName}(${times.join(', ')})`);
      }
    });

    // Si no tiene disponibilidad en ningún día, devolvemos cadena vacía
    return [dayAvailability.join(', ')];
  });

  // ====================== 4. Limpiar columna E antes de escribir ======================
  const lastRowProviders = providersSheet.getLastRow();
  if (lastRowProviders >= 2) {
    providersSheet.getRange(2, 5, lastRowProviders - 1, 1).clearContent(); // Limpia columna E desde fila 2
  }

  // ====================== 5. Escribir resultados en columna E ======================
  providersSheet.getRange(2, 5, output.length, 1).setValues(output);

  console.log(`✅ Disponibilidad semanal escrita en columna E de 'providers bio' (${output.length} filas)`);
}

// ====================== FUNCIONES AUXILIARES ======================

/**
 * Normaliza los horarios y devuelve un array de strings limpios
 * Ej: "8am - 9am, 9pm - 10pm" → ["8-9am", "9-10pm"]
 */
function normalizeTimeSlots(cell) {
  if (!cell) return [];

  const text = cell.toString().trim();
  if (text === '') return [];

  // Separar por coma o punto y coma
  const slots = text.split(/[,;]/).map(slot => slot.trim());

  const cleanedSlots = [];

  for (let slot of slots) {
    if (slot === '') continue;

    // Reemplazar "am" → "am", "pm" → "pm" y normalizar guiones
    let cleaned = slot
      .replace(/\s*-\s*/g, '-')           // Normaliza guiones con espacios
      .replace(/(\d)(am|pm)/gi, '$1$2')   // Quita espacio antes de am/pm
      .replace(/(\d+):00(am|pm)/gi, '$1$2') // Convierte 8:00am → 8am
      .trim();

    if (cleaned) cleanedSlots.push(cleaned);
  }

  return cleanedSlots;
}

/**
 * Obtiene la última fila con datos reales usando una columna como ancla
 */
function getLastRowWithData(sheet, column) {
  const maxRows = sheet.getMaxRows();
  const values = sheet.getRange(2, column, maxRows - 1, 1).getValues().flat();

  for (let i = values.length - 1; i >= 0; i--) {
    const val = values[i];
    if (val != null && val.toString().trim() !== '') {
      return i + 2;
    }
  }
  return 1;
}