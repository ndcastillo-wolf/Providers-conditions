// ============================================================
// notifications.js
// Responsibility: Email alerts when new form requests arrive.
//
// Setup (one-time):
//   1. Add recipient emails to Script Properties:
//        HOLD_NOTIFY_RECIPIENTS  →  "a@healthloft.com,b@healthloft.com"
//        LIC_NOTIFY_RECIPIENTS   →  "a@healthloft.com"
//        COND_NOTIFY_RECIPIENTS  →  "a@healthloft.com"
//   2. Run installNotificationTriggers() once (or use the menu).
// ============================================================

// ── Shared email helper ───────────────────────────────────────

function sendAlertEmail_(recipientsCsv, subject, rows) {
  if (!recipientsCsv) return;

  const rowsHtml = rows.map(([label, value]) =>
    `<tr>
       <td style="padding:4px 12px 4px 0;font-weight:bold;white-space:nowrap;color:#555">${label}</td>
       <td style="padding:4px 0">${value || "—"}</td>
     </tr>`
  ).join('');

  const sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();

  MailApp.sendEmail({
    to:       recipientsCsv,
    subject:  subject,
    htmlBody: `<table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">
                 ${rowsHtml}
               </table>
               <br>
               <a href="${sheetUrl}" style="font-family:Arial,sans-serif;font-size:13px">
                 → Open spreadsheet
               </a>`
  });

  Logger.log(`Alert sent: ${subject} → ${recipientsCsv}`);
}

// ── Per-form handlers ─────────────────────────────────────────
// Each trigger fires for ALL form submissions on this spreadsheet,
// so every handler checks the sheet name first and returns early if it's not the right form.

function onHoldRequestSubmit(e) {
  if (!e || !e.range) return;
  if (e.range.getSheet().getName() !== "Hold requests") return;

  const recipients = PropertiesService.getScriptProperties().getProperty('HOLD_NOTIFY_RECIPIENTS');
  if (!recipients) return;

  const v       = e.values || [];
  const email   = (v[2] || "").toString().trim();   // col C — provider email
  const endDate = (v[4] || "").toString().trim();   // col E — hold end date

  sendAlertEmail_(
    recipients,
    `🟡 New hold request — ${email || "(no email)"}`,
    [
      ["Provider email", email],
      ["Hold end date",  endDate],
      ["Submitted",      new Date().toLocaleString()]
    ]
  );
}

function onLicensureUpdateSubmit(e) {
  if (!e || !e.range) return;
  if (e.range.getSheet().getName() !== "licensure update") return;

  const recipients = PropertiesService.getScriptProperties().getProperty('LIC_NOTIFY_RECIPIENTS');
  if (!recipients) return;

  const v     = e.values || [];
  const email = (v[2] || "").toString().trim();   // col C — provider email

  // Cols D–BB (indices 3..53) are the state licensure fields
  const stateCount = v.slice(3, 54).filter(val => val !== null && val !== undefined && val.toString().trim() !== '').length;

  sendAlertEmail_(
    recipients,
    `🪪 New licensure update — ${email || "(no email)"}`,
    [
      ["Provider email",  email],
      ["States filled",   stateCount.toString()],
      ["Submitted",       new Date().toLocaleString()]
    ]
  );
}

function onConditionsUpdateSubmit(e) {
  if (!e || !e.range) return;
  if (e.range.getSheet().getName() !== "conditions update") return;

  const recipients = PropertiesService.getScriptProperties().getProperty('COND_NOTIFY_RECIPIENTS');
  if (!recipients) return;

  const v     = e.values || [];
  const email = (v[2] || "").toString().trim();   // col C — provider email

  // Cols D–CT (indices 3..97) are the condition fields
  const condCount = v.slice(3, 98).filter(val => val !== null && val !== undefined && val.toString().trim() !== '').length;

  sendAlertEmail_(
    recipients,
    `🥬 New conditions update — ${email || "(no email)"}`,
    [
      ["Provider email",       email],
      ["Conditions filled",    condCount.toString()],
      ["Submitted",            new Date().toLocaleString()]
    ]
  );
}

// ── Trigger installation ──────────────────────────────────────

function installNotificationTriggers() {
  const notifFunctions = new Set([
    'onHoldRequestSubmit',
    'onLicensureUpdateSubmit',
    'onConditionsUpdateSubmit'
  ]);

  // Remove any stale copies of these triggers before re-installing.
  ScriptApp.getProjectTriggers().forEach(t => {
    if (notifFunctions.has(t.getHandlerFunction())) ScriptApp.deleteTrigger(t);
  });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  notifFunctions.forEach(fn => {
    ScriptApp.newTrigger(fn).forSpreadsheet(ss).onFormSubmit().create();
  });

  SpreadsheetApp.getUi().alert(
    '✅ Notification triggers installed!\n\n' +
    'Make sure these Script Properties are set:\n' +
    '  HOLD_NOTIFY_RECIPIENTS\n' +
    '  LIC_NOTIFY_RECIPIENTS\n' +
    '  COND_NOTIFY_RECIPIENTS'
  );
}
