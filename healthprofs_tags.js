/// MENU Function for Health Loft Tools toggle 


function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('Health Loft Tools')
    
    // ────────────────────────────────────────────────
    .addItem('*New Provider', 'dummy')
    .addItem('   🔄 Update Hiring Form responses', 'runBackfillFormResponses')
    
    .addSeparator()
    
    // ────────────────────────────────────────────────
    .addItem('*Availability', 'dummy')
    .addItem('   📕 Update Hold requests', 'runProcessHoldRequests')
    .addItem('   🥗 Lift Hold (set to OPEN)', 'runPromptAndLiftHold')
    .addItem('   🛑 Set HOLD (indefinite)', 'runPromptAndSetHold')
    
    .addSeparator()
    
    // ────────────────────────────────────────────────
    .addItem('*Licensures', 'dummy')
    .addItem('   🪪 Update New Licensures settings', 'runProcessLicensuresUpdates')
    .addItem('   ⚠️ Mark License EXPIRED', 'runPromptMarkLicenseExpired')
    
    .addSeparator()
    
    // ────────────────────────────────────────────────
    .addItem('*Conditions & Profiles', 'dummy')
    .addItem('   🥬 Update conditions settings', 'runProcessConditionsUpdates')
    
    .addSeparator()
    
    // ────────────────────────────────────────────────
    .addItem('*Providers Bio', 'dummy')
    .addItem('   🔄 Refresh Platform Tags', 'runRefreshAllPlatforms')
    
    .addToUi();
}

// Dummy function (does nothing – just for menu titles)
function dummy() {
  // Intentionally empty – this item is not meant to be clicked
}

function refreshAllPlatforms() {
  generateConditionsToProvidersBio(); // FIRST it generates the conditions (able to see, specialties) ffor the provers bio tab 
  addActiveStatesToProvidersHealthprof(); // checks the active states for providers 
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const bioSheet = ss.getSheetByName("providers bio");
  if (!bioSheet) return uiAlert("Sheet 'providers bio' not found!");

  const lastRow = bioSheet.getLastRow();
  if (lastRow < 3) return;

  // ==================== Platforms configuration s ====================
  const platforms = [
    {
      name: "Healthprofs",
      sheetName: "conditions",
      range: "C2:D134",        // current range 
      outputCol: 18           // O = column 15
    },
    {
      name: "Healthgrades",
      sheetName: "conditions healthgrades",
      range: "A2:B71",        //
      outputCol: 19            // P = column 16
    },
    {
      name: "Zocdoc",
      sheetName: "conditions zocdoc",
      range: "A2:B121",        //
      outputCol: 20            // Q = column 17
    },
    {
      name: "Webmd",
      sheetName: "conditions webmd",
      range: "A2:B94",        //
      outputCol: 21            // R = column 18
    },
    {
      name: "Healthie",
      sheetName: "conditions healthie",
      range: "A2:B128",        //
      outputCol: 22       // S  = column 19
    },
    // EXAMPLE COPY PASTE :
    // {
    //   name: "Platform C",
    //   sheetName: "PlatformC_conditions",
    //   range: "C2:D250",
    //   outputCol: 17
    // }
  ];

  let updatedCount = 0;

  platforms.forEach(platform => {
    const mapSheet = ss.getSheetByName(platform.sheetName);
    if (!mapSheet) {
      Logger.log(`⚠️ Mapping sheet "${platform.sheetName}" not found – skipping`);
      return;
    }

    // Use the exact range you defined
    const mapData = mapSheet.getRange(platform.range).getValues();

    const inputData = bioSheet.getRange(`K3:L${lastRow}`).getValues();

    const results = inputData.map(([h, i]) => {
      const combined = (h || "") + "," + (i || "");
      return [getPlatformTagsFromText(combined, mapData)];
    });

    // Write to the correct output column
    bioSheet.getRange(3, platform.outputCol, results.length, 1).setValues(results);
    updatedCount += results.length;
  });

  SpreadsheetApp.getUi().alert(`✅ ALL platforms refreshed!\n\nUpdated ${updatedCount} rows across ${platforms.length} platforms.\n\nCheck View → Logs for unmatched conditions.`);
}

/* ==================== CORE LOGIC  ==================== */
function getPlatformTagsFromText(text, mapData) {
  if (!text || text.toString().trim() === "") return "";

  const rawList = text.toString().split(",");
  const internals = [];

  rawList.forEach(item => {
    let s = item.trim();
    const open = s.indexOf("[");
    const close = s.lastIndexOf("]");
    if (open !== -1 && close > open) {
      s = s.substring(open + 1, close).trim();
    }
    if (s) internals.push(s.toLowerCase());
  });

  if (internals.length === 0) return "";

  const found = new Set();
  const allMapped = new Set();

  mapData.forEach(([platformTag, internalTag]) => {
    const p = (platformTag || "").toString().trim();
    const i = (internalTag || "").toString().trim().toLowerCase();
    if (p) {
      if (internals.includes(i)) found.add(p);
      allMapped.add(i);
    }
  });

  internals.forEach(cond => {
    if (!allMapped.has(cond)) {
      Logger.log(`⚠️ UNMATCHED: "${cond}" (Platform input: ${text})`);
    }
  });

  return Array.from(found).sort().join(", ");
}

/* Old formula  */
function GETPLATFORMTAGS(hCell, iCell) {
  // Defaults to first platform (Healthprofs) for backward compatibility
  const mapData = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("conditions")
    .getRange("C2:D134")
    .getValues();
  return getPlatformTagsFromText((hCell||"") + "," + (iCell||""), mapData);
}




/// This function performs the prompt and sets an 'OPEN' state, can't be tested on it's own, use the UI 

function promptAndLiftHold() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.prompt(
    'Lift Hold – Set to OPEN',
    'Enter the provider email exactly as in column E of "clean data":',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    return;  // user canceled
  }

  const email = response.getResponseText().trim();
  if (!email) {
    ui.alert('No email entered. Nothing done.');
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('clean data');
  
  if (!sheet) {
    ui.alert('Sheet "clean data" not found!');
    return;
  }

  const data = sheet.getDataRange().getValues();
  const idColIndex = 5 - 1;     // E → 4 (0-based)
  const statusCol = 175;        // FS (1-based)

  let foundRow = -1;
  for (let i = 1; i < data.length; i++) {
    const cell = (data[i][idColIndex] || '').toString().trim();
    if (cell === email) {
      foundRow = i + 1;
      break;
    }
  }

  if (foundRow === -1) {
    ss.toast(`Email not found: ${email}`, 'Not found', 5);
    return;
  }

  sheet.getRange(foundRow, statusCol).setValue('OPEN');
  
  ss.toast(`Hold lifted → OPEN\n${email}`, 'Success', 5);
}


/**
 * Prompt user for email and set provider status to HOLD (indefinite hold)
 * Mirrors the structure of promptAndLiftHold()
 */
function promptAndSetHold() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let ui = null;

  try {
    ui = SpreadsheetApp.getUi();
  } catch (e) {
    // UI not available in this context (trigger, etc.)
    ss.toast("Cannot show prompt in this context. Run from menu.", "Info", 10);
    Logger.log("UI not available: " + e.message);
    return;
  }

  // ── Show native prompt when UI is available ──
  const response = ui.prompt(
    'Set to HOLD (Indefinite)',
    'Enter the provider email exactly as in column E of "clean data":',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    return;  // user canceled
  }

  const email = response.getResponseText().trim();
  if (!email) {
    ui.alert('No email entered. Nothing done.');
    return;
  }

  performSetHold(ss, email, ui);
}

/**
 * Core logic: find row by email and set status column FS to HOLD
 * 
 */
function performSetHold(ss, email, ui = null) {
  const sheet = ss.getSheetByName('clean data');
  
  if (!sheet) {
    const msg = 'Sheet "clean data" not found!';
    if (ui) ui.alert(msg);
    ss.toast(msg, 'Error', 5);
    return;
  }

  const data = sheet.getDataRange().getValues();
  const idColIndex = 5 - 1;      // Column E → 0-based index 4
  const statusCol = 175;         // Column FS → 1-based column 175

  let foundRow = -1;
  for (let i = 1; i < data.length; i++) {
    const cell = (data[i][idColIndex] || '').toString().trim();
    if (cell === email) {
      foundRow = i + 1;
      break;
    }
  }

  if (foundRow === -1) {
    const msg = `Email not found: ${email}`;
    ss.toast(msg, 'Not found', 5);
    if (ui) ui.alert(msg);
    return;
  }

  // ── You can customize the exact text here ──
  // Option A: simple indefinite hold
  const holdStatus = "HOLD undefined";

  // Option B: more explicit (uncomment if preferred)
  // const holdStatus = "HOLD – indefinite";

  // Option C: include today's date
  // const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "M/d/yyyy");
  // const holdStatus = `HOLD since ${today} (indefinite)`;

  sheet.getRange(foundRow, statusCol).setValue(holdStatus);

  const successMsg = `Status set to HOLD\n${email}`;
  ss.toast(successMsg, 'Success', 5);
  if (ui) ui.alert(successMsg);
}

