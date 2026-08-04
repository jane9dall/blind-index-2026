/**
 * Blind Index Google Apps Script web-app handler.
 *
 * - 리포트 팝업 제출  → "리포트 요청" 탭
 * - 솔루션 상담 신청  → "상담 신청" 탭
 * - 방문/공유 유입 로그 → "방문로그" 탭
 *
 * 배포 방법: 시트에서 확장 프로그램 → Apps Script에 붙여넣고
 * 웹 앱으로 배포 (실행: 나, 액세스: 모든 사용자).
 * 코드 수정 후에는 배포 → 배포 관리 → 연필 → "버전: 새 버전"으로
 * 갱신해야 기존 /exec URL에 반영됩니다.
 */
var SPREADSHEET_ID = '1J-0g24ix9eeCs83k1INXwikOngvUMt_HclY1RnvhW_g';

var SUBMIT_HEADERS = ['기록 시각', '회사명', '담당자명', '직함', '회사 이메일', '모바일 번호', '제출 페이지'];

// 스크립트가 시트에 붙어(container-bound) 있으면 그 시트를, 아니면 위 ID의 시트를 사용
function getSpreadsheet_() {
  try {
    const bound = SpreadsheetApp.getActiveSpreadsheet();
    if (bound) return bound;
  } catch (err) {}
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function doPost(e) {
  const params = (e && e.parameter) || {};
  const spreadsheet = getSpreadsheet_();

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

  // 구분값에 따라 탭 분리: 솔루션 신청 → "상담 신청", 그 외 → "리포트 요청"
  const tabName = params.type === '솔루션 신청' ? '상담 신청' : '리포트 요청';
  const sheet = getOrCreateSheet_(spreadsheet, tabName, SUBMIT_HEADERS);
  sheet.appendRow([
    new Date(),
    params.company || '',
    params.name || '',
    params.position || '',
    params.email || '',
    params.phone || '',
    params.page || ''
  ]);
  return json_({ ok: true });
}

// Apps Script 편집기에서 저장 여부를 확인할 때 실행하는 테스트 함수입니다.
// 실행하면 "리포트 요청"과 "상담 신청" 탭에 각각 테스트 행이 1건씩 들어갑니다.
function testSubmission() {
  doPost({
    parameter: {
      type: '리포트 요청',
      company: '테스트 기업',
      name: '홍길동',
      position: '매니저',
      email: 'test@example.com',
      phone: '010-0000-0000',
      page: 'https://example.com/report.html'
    }
  });
  return doPost({
    parameter: {
      type: '솔루션 신청',
      company: '테스트 기업',
      name: '홍길동',
      position: '매니저',
      email: 'test@example.com',
      phone: '010-0000-0000',
      page: 'https://example.com/?screen=solution'
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
