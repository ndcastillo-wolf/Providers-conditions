// ============================================================
// menu.js
// Responsibility: UI menu definition and run* wrappers
// ============================================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu('Health Loft Tools')

    .addItem('*New Provider', 'dummy')
    .addItem('   🔄 Update Hiring Form responses', 'runBackfillFormResponses')

    .addSeparator()

    .addItem('*Availability', 'dummy')
    .addItem('   📕 Update Hold requests', 'runProcessHoldRequests')
    .addItem('   🥗 Lift Hold (set to OPEN)', 'runPromptAndLiftHold')
    .addItem('   🛑 Set HOLD (indefinite)', 'runPromptAndSetHold')

    .addSeparator()

    .addItem('*Licensures', 'dummy')
    .addItem('   🪪 Update New Licensures settings', 'runProcessLicensuresUpdates')
    .addItem('   ⚠️ Mark License EXPIRED', 'runPromptMarkLicenseExpired')

    .addSeparator()

    .addItem('*Conditions & Profiles', 'dummy')
    .addItem('   🥬 Update conditions settings', 'runProcessConditionsUpdates')

    .addSeparator()

    .addItem('*Providers Bio', 'dummy')
    .addItem('   🔄 Refresh Platform Tags', 'runRefreshAllPlatforms')

    .addToUi();
}

// Dummy function — used as non-clickable menu section title
function dummy() {}

// ── Wrappers ──────────────────────────────────────────────

function runBackfillFormResponses() {
  backfillFormResponses();
}

function runProcessHoldRequests() {
  processHoldRequests();
}

function runPromptAndLiftHold() {
  promptAndLiftHold();
}

function runPromptAndSetHold() {
  promptAndSetHold();
}

function runProcessLicensuresUpdates() {
  processLicensuresUpdates();
}

function runPromptMarkLicenseExpired() {
  promptMarkLicenseExpired();
}

function runProcessConditionsUpdates() {
  processConditionsUpdates();
}

function runRefreshAllPlatforms() {
  refreshAllPlatforms();
}
