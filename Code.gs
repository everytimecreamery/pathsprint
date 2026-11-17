/**
 * PathSprint — Online Career Development & Mentorship Community
 * Google Apps Script Web App Endpoint for On-Page Career Assessments
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open your target Google Sheet.
 * 2. Click "Extensions" > "Apps Script".
 * 3. Replace all code in the script editor with this Code.gs file.
 * 4. If container-bound (opened from the sheet), it auto-detects the active spreadsheet.
 *    If deploying as a standalone Apps Script, set SHEET_ID to your spreadsheet ID:
 *    https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit
 * 5. Click "Deploy" (top right) > "New deployment".
 * 6. Click the gear icon next to "Select type" and choose "Web app".
 * 7. Set configuration:
 *    - Description: "PathSprint Assessment Intake v1"
 *    - Execute as: "Me" (your Google account)
 *    - Who has access: "Anyone"
 * 8. Click "Deploy", review permissions, and grant access.
 * 9. Copy the generated "Web app URL" (ends in /exec).
 * 10. Paste this URL into index.html inside CONFIG.assessmentEndpointUrl.
 */

const SHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
const TAB = 'Assessments';

const HEADERS = [
  'Timestamp',
  'Name',
  'WhatsApp',
  'Stage',
  'CollegeDegreeCity',
  'Direction',
  'Struggle',
  'ResumeStatus',
  'LinkedInStatus',
  'Target',
  'WantsCall',
  'Source',
  'ClientTS'
];

function getSpreadsheet() {
  if (SHEET_ID && SHEET_ID !== 'YOUR_SPREADSHEET_ID_HERE') {
    return SpreadsheetApp.openById(SHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateSheet() {
  const ss = getSpreadsheet();
  if (!ss) {
    throw new Error('Spreadsheet not found. Please verify SHEET_ID or bind script to your sheet.');
  }
  
  let sheet = ss.getSheetByName(TAB);
  if (!sheet) {
    sheet = ss.insertSheet(TAB);
    sheet.appendRow(HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground('#1B3A5C').setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground('#1B3A5C').setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, error: 'Empty request payload' });
    }

    const data = JSON.parse(e.postData.contents);

    // Honeypot check: silently return ok if honeypot was populated by a bot
    if (data.website && String(data.website).trim() !== '') {
      return jsonResponse({ ok: true });
    }

    // Required fields validation
    const required = ['name', 'whatsapp', 'stage', 'context', 'direction', 'struggle', 'resume', 'linkedin', 'call'];
    for (let i = 0; i < required.length; i++) {
      const field = required[i];
      if (!data[field] || String(data[field]).trim() === '') {
        return jsonResponse({ ok: false, error: 'Missing required field: ' + field });
      }
    }

    // 10-digit Indian WhatsApp validation
    const rawPhone = String(data.whatsapp).replace(/[\s\-\(\)\.]/g, '');
    let cleanPhone = rawPhone;
    if (cleanPhone.startsWith('+91')) {
      cleanPhone = cleanPhone.substring(3);
    } else if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.substring(2);
    } else if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      cleanPhone = cleanPhone.substring(1);
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return jsonResponse({ ok: false, error: 'Invalid 10-digit Indian WhatsApp number' });
    }

    // Prevent concurrent write collisions with script lock
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);

    try {
      const sheet = getOrCreateSheet();
      const timestamp = new Date();

      const row = [
        timestamp,
        String(data.name).trim(),
        "'" + cleanPhone,
        String(data.stage).trim(),
        String(data.context).trim(),
        String(data.direction).trim(),
        String(data.struggle).trim(),
        String(data.resume).trim(),
        String(data.linkedin).trim(),
        data.target ? String(data.target).trim() : '',
        String(data.call).trim(),
        data.source ? String(data.source).trim() : '',
        data.ts ? String(data.ts).trim() : ''
      ];

      sheet.appendRow(row);
      return jsonResponse({ ok: true });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: err.toString() });
  }
}

function doGet(e) {
  return jsonResponse({ ok: true, status: 'live' });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
