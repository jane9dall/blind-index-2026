/**
 * Blind Index Google Apps Script web-app handler.
 *
 * Deploy this script as a Web app (execute as the spreadsheet owner, access:
 * anyone) using the same /exec URL configured in index.html.
 */
function doPost(e) {
  const params = (e && e.parameter) || {};
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (params.action === 'share_visit') {
    const sheet = getOrCreateSheet_(spreadsheet, '방문로그', [
      '기록 시각', '회사명', '클릭 시각 (ISO)', '공유 링크'
    ]);
    sheet.appendRow([
      new Date(),
      params.company || '',
      params.clickedAt || '',
      params.page || ''
    ]);
    return json_({ ok: true });
  }

  const demoSheet = getOrCreateSheet_(spreadsheet, '데모요청', [
    '기록 시각', '회사명', '담당자 이름', '업무용 이메일'
  ]);
  demoSheet.appendRow([new Date(), params.company || '', params.name || '', params.email || '']);
  return json_({ ok: true });
}

function getOrCreateSheet_(spreadsheet, name, headers) {
  const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  return sheet;
}

function json_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
