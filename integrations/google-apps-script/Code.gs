/**
 * Blind Index Google Apps Script web-app handler.
 *
 * Deploy this script as a Web app (execute as the spreadsheet owner, access:
 * anyone) using the same /exec URL configured in index.html.
 */
function doPost(e) {
  const params = (e && e.parameter) || {};
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (params.action === 'visit_log') {
    const sheet = getOrCreateSheet_(spreadsheet, '방문로그', [
      '서버 기록 시각', '이벤트', '회사명', '클라이언트 시각 (ISO)',
      '방문 페이지', '리퍼러', '사용자 에이전트', '언어', '시간대', '화면 크기',
      'IP 주소', 'IP 기반 위치'
    ]);
    sheet.appendRow([
      new Date(),
      params.event || 'page_view',
      params.company || '',
      params.clientAt || '',
      params.page || '',
      params.referrer || '',
      params.userAgent || '',
      params.language || '',
      params.timezone || '',
      params.viewport || '',
      params.ip || '',
      params.location || ''
    ]);
    return json_({ ok: true });
  }

  const demoSheet = getOrCreateSheet_(spreadsheet, '데모요청', [
    '기록 시각', '회사명', '담당자 이름', '업무용 이메일'
  ]);
  demoSheet.appendRow([new Date(), params.company || '', params.name || '', params.email || '']);
  return json_({ ok: true });
}

// Apps Script 편집기에서 방문로그 저장 여부를 확인할 때 이 함수를 실행합니다.
function testVisitLog() {
  return doPost({
    parameter: {
      action: 'visit_log',
      event: 'test_visit',
      company: '테스트 기업',
      clientAt: new Date().toISOString(),
      page: 'https://example.com/?company=test&ref=share',
      referrer: 'https://example.com/',
      userAgent: 'Apps Script test',
      language: 'ko-KR',
      timezone: 'Asia/Seoul',
      viewport: '1280x800'
    }
  });
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
