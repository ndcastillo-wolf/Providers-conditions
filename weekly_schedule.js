function getWeeklyAvailability() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const cleanSheet = ss.getSheetByName('clean data');
  const providersSheet = ss.getSheetByName('providers bio');

  if (!cleanSheet || !providersSheet) {
    console.error("❌ Faltan hojas requeridas");
    return;
  }

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  console.log("🔍 === INICIO getWeeklyAvailability ===");

  // 1. Información básica de la hoja
  const lastRowSheet = cleanSheet.getLastRow();
  const maxRowsSheet = cleanSheet.getMaxRows();
  console.log(`📊 Hoja 'clean data' → LastRow: ${lastRowSheet} | MaxRows: ${maxRowsSheet}`);

  // 2. Definir rango FC:FI
  const firstCol = 159;  // FC
  const numCols = 7;    // FI = 84 + 6

  console.log(`🎯 Leyendo columnas FC:${String.fromCharCode(64 + firstCol + numCols - 1)} (${firstCol} a ${firstCol + numCols - 1})`);

  // 3. Leer los datos
  const availabilityData = cleanSheet.getRange(2, firstCol, lastRowSheet - 1, numCols).getValues();

  console.log(`📥 Se leyeron ${availabilityData.length} filas × ${availabilityData[0]?.length || 0} columnas`);

  // 4. Debugging: Mostrar contenido de las primeras 3 filas y la última fila
  console.log("🔎 Contenido de las primeras 3 filas (FC:FI):");
  for (let i = 0; i < Math.min(3, availabilityData.length); i++) {
    console.log(`   Fila ${i+2}: ${JSON.stringify(availabilityData[i])}`);
  }

  if (availabilityData.length > 3) {
    console.log(`   ...`);
    console.log(`   Última fila (${lastRowSheet}): ${JSON.stringify(availabilityData[availabilityData.length - 1])}`);
  }

  // 5. Procesar cada fila
  const output = availabilityData.map((row, index) => {
    const dayAvailability = [];
    const rowNum = index + 2;

    row.forEach((cell, i) => {
      const times = normalizeTimeSlots(cell);
      const dayName = daysOfWeek[i];

      if (times.length > 0) {
        dayAvailability.push(`${dayName}(${times.join(', ')})`);
        console.log(`   → Fila ${rowNum} | ${dayName}: ${times.join(', ')}`);
      } else {
        // Log solo si quieres ver los días vacíos (puedes comentarlo después)
        // console.log(`   → Fila ${rowNum} | ${dayName}: (vacío)`);
      }
    });

    const result = dayAvailability.join(', ');
    if (result) {
      console.log(`   ✓ Fila ${rowNum} → "${result}"`);
    }

    return [result];
  });

  // 6. Escribir en Providers Bio
  console.log(`\n✍️ Preparando escritura de ${output.length} filas en columna E`);

  const providersLastRow = providersSheet.getLastRow();
  if (providersLastRow >= 2) {
    console.log(`🧹 Limpiando columna E desde fila 2 hasta ${providersLastRow}`);
    providersSheet.getRange(3, 5, providersLastRow - 1, 1).clearContent();
  }

  providersSheet.getRange(3, 5, output.length, 1).setValues(output);

  console.log(`✅ FINALIZADO: Se escribieron ${output.length} filas en columna E de 'providers bio'`);
  console.log("🔚 === FIN getWeeklyAvailability ===\n");
}

// ====================== AUXILIAR ======================
function normalizeTimeSlots(cell) {
  if (!cell) return [];

  const text = cell.toString().trim();
  if (text === '') return [];

  const slots = text.split(/[,;]/);

  const cleaned = slots.map(slot => {
    return slot.trim()
      .replace(/\s*-\s*/g, '-')
      .replace(/(\d)\s*(am|pm)/gi, '$1$2')
      .replace(/(\d+):00(am|pm)/gi, '$1$2');
  }).filter(slot => slot.length > 0);

  return cleaned;
}