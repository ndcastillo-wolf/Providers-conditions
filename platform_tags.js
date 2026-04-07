// ============================================================
// platform_tags.js
// Responsibility: Map provider conditions to platform-specific tags
// ============================================================

function refreshAllPlatforms() {
  generateConditionsToProvidersBio();
  addActiveStatesToProvidersHealthprof();
  getWeeklyAvailability();

  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const bioSheet = ss.getSheetByName("providers bio");
  if (!bioSheet) return SpreadsheetApp.getUi().alert("Sheet 'providers bio' not found!");

  const lastRow = bioSheet.getLastRow();
  if (lastRow < 3) return;

  const platforms = [
    {
      name:      "Healthprofs",
      sheetName: "conditions healthprofs",
      range:     "A2:B180",
      outputCol: BIO_COL.HEALTHPROFS
    },
    {
      name:      "Healthgrades",
      sheetName: "conditions healthgrades",
      range:     "A2:B171",
      outputCol: BIO_COL.HEALTHGRADES
    },
    {
      name:      "Zocdoc",
      sheetName: "conditions zocdoc",
      range:     "A2:B160",
      outputCol: BIO_COL.ZOCDOC
    },
    {
      name:      "Webmd",
      sheetName: "conditions webmd",
      range:     "A2:B160",
      outputCol: BIO_COL.WEBMD
    },
    {
      name:      "Healthie",
      sheetName: "conditions healthie",
      range:     "A2:B160",
      outputCol: BIO_COL.HEALTHIE
    },
  ];

  let updatedCount = 0;

  platforms.forEach(platform => {
    const mapSheet = ss.getSheetByName(platform.sheetName);
    if (!mapSheet) {
      Logger.log(`⚠️ Mapping sheet "${platform.sheetName}" not found – skipping`);
      return;
    }

    const mapData   = mapSheet.getRange(platform.range).getValues();
    const inputData = bioSheet.getRange(`K3:L${lastRow}`).getValues();

    const results = inputData.map(([h, i]) => {
      const combined = (h || "") + "," + (i || "");
      return [getPlatformTagsFromText(combined, mapData)];
    });

    bioSheet.getRange(3, platform.outputCol, results.length, 1).setValues(results);
    updatedCount += results.length;
  });

  SpreadsheetApp.getUi().alert(
    `✅ ALL platforms refreshed!\n\nUpdated ${updatedCount} rows across ${platforms.length} platforms.\n\nCheck View → Logs for unmatched conditions.`
  );
}

function getPlatformTagsFromText(text, mapData) {
  if (!text || text.toString().trim() === "") return "";

  const internals = text.toString().split(",").map(item => {
    let s = item.trim();
    const open  = s.indexOf("[");
    const close = s.lastIndexOf("]");
    if (open !== -1 && close > open) {
      s = s.substring(open + 1, close).trim();
    }
    return s ? s.toLowerCase() : null;
  }).filter(Boolean);

  if (internals.length === 0) return "";

  const found    = new Set();
  const allMapped = new Set();

  mapData.forEach(([platformTag, internalTag]) => {
    const p = (platformTag  || "").toString().trim();
    const i = (internalTag  || "").toString().trim().toLowerCase();
    if (p) {
      if (internals.includes(i)) found.add(p);
      allMapped.add(i);
    }
  });

  internals.forEach(cond => {
    if (!allMapped.has(cond)) {
      Logger.log(`⚠️ UNMATCHED: "${cond}" (input: ${text})`);
    }
  });

  return Array.from(found).sort().join(", ");
}

// Legacy custom formula shim — defaults to Healthprofs mapping
function GETPLATFORMTAGS(hCell, iCell) {
  const mapData = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("conditions")
    .getRange("C2:D134")
    .getValues();
  return getPlatformTagsFromText((hCell || "") + "," + (iCell || ""), mapData);
}
