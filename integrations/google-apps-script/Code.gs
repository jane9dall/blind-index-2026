/**
 * Blind Index Google Apps Script web-app handler.
 *
 * - 리포트 팝업 제출  → "리포트 요청" 탭
 * - 솔루션 상담 신청  → "상담 신청" 탭
 * - 방문/공유 유입 로그 → "방문 로그" 탭
 *
 * 배포 방법: 시트에서 확장 프로그램 → Apps Script에 붙여넣고
 * 웹 앱으로 배포 (실행: 나, 액세스: 모든 사용자).
 * 코드 수정 후에는 배포 → 배포 관리 → 연필 → "버전: 새 버전"으로
 * 갱신해야 기존 /exec URL에 반영됩니다.
 *
 * 열은 "헤더 이름"에 맞춰 기록합니다(appendRecord_ 참고).
 * 시트의 기존 열 순서가 코드와 달라도 이름 기준으로 정확히 들어가며,
 * 코드에만 있고 시트에 없는 열은 맨 뒤에 자동으로 추가됩니다.
 * (과거에 순서가 어긋나 저장된 기존 행은 코드가 소급 수정하지 못하므로,
 *  깔끔하게 맞추려면 해당 탭을 비우거나 삭제 후 재생성되게 하면 됩니다.)
 */
var SPREADSHEET_ID = '1J-0g24ix9eeCs83k1INXwikOngvUMt_HclY1RnvhW_g';

// 배포 반영 확인용 버전. 배포 후 /exec 주소를 브라우저에서 열면 이 값이 보입니다.
// 여기 값이 안 보이거나 옛 값이면 = 새 코드가 아직 반영 안 된 것(재배포 필요).
var CODE_VERSION = '2026-08-12';

// 제출 탭(리포트 요청 / 상담 신청) 열 순서
var SUBMIT_HEADERS = [
  '담당자명', '직함', '회사명', '모바일 번호', '회사 이메일',
  'UTM 소스', 'UTM 매체', 'UTM 캠페인', 'UTM 콘텐츠', 'UTM 검색어',
  '유입 경로', '제출일시', '제출 페이지'
];

// 방문 로그 탭 열 순서
var VISIT_HEADERS = [
  '서버 기록 시각', '이벤트', '회사명', '클라이언트 시각 (ISO)', '방문 페이지',
  'UTM 소스', 'UTM 매체', 'UTM 캠페인', 'UTM 콘텐츠', 'UTM 검색어',
  '리퍼러', '사용자 에이전트', '언어', '시간대', '화면 크기'
];

// 스크립트가 시트에 붙어(container-bound) 있으면 그 시트를, 아니면 위 ID의 시트를 사용
function getSpreadsheet_() {
  try {
    const bound = SpreadsheetApp.getActiveSpreadsheet();
    if (bound) return bound;
  } catch (err) {}
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// 브라우저에서 /exec 주소를 그냥 열면 실행됩니다. 배포된 코드 버전 확인용.
function doGet(e) {
  return json_({ ok: true, version: CODE_VERSION, visitTab: '방문 로그' });
}

function doPost(e) {
  const params = getParams_(e);
  const spreadsheet = getSpreadsheet_();

  if (params.action === 'visit_log') {
    const sheet = getSheet_(spreadsheet, '방문 로그', VISIT_HEADERS);
    appendRecord_(sheet, {
      '서버 기록 시각': new Date(),
      '이벤트': params.event || 'page_view',
      '회사명': params.company || '',
      '클라이언트 시각 (ISO)': params.clientAt || '',
      '방문 페이지': params.page || '',
      'UTM 소스': params.utm_source || '',
      'UTM 매체': params.utm_medium || '',
      'UTM 캠페인': params.utm_campaign || '',
      'UTM 콘텐츠': params.utm_content || '',
      'UTM 검색어': params.utm_term || '',
      '리퍼러': params.referrer || '',
      '사용자 에이전트': params.userAgent || '',
      '언어': params.language || '',
      '시간대': params.timezone || '',
      '화면 크기': params.viewport || ''
    }, VISIT_HEADERS);
    return json_({ ok: true });
  }

  // 핵심 필드가 하나도 없는 요청(봇, 본문 유실 등)은 리드 탭에 쓰지 않고
  // "수신 오류" 탭에 원본만 남긴다 — 제출일시만 있는 빈 행 방지
  if (!params.name && !params.company && !params.email && !params.phone) {
    logMalformed_(spreadsheet, e);
    return json_({ ok: false, reason: 'empty' });
  }

  // 구분값에 따라 탭 분리: 솔루션 신청 → "상담 신청", 그 외 → "리포트 요청"
  const tabName = params.type === '솔루션 신청' ? '상담 신청' : '리포트 요청';
  const sheet = getSheet_(spreadsheet, tabName, SUBMIT_HEADERS);
  appendRecord_(sheet, {
    '담당자명': params.name || '',
    '직함': params.position || '',
    '회사명': params.company || '',
    '모바일 번호': params.phone || '',
    '회사 이메일': params.email || '',
    'UTM 소스': params.utm_source || '',
    'UTM 매체': params.utm_medium || '',
    'UTM 캠페인': params.utm_campaign || '',
    'UTM 콘텐츠': params.utm_content || '',
    'UTM 검색어': params.utm_term || '',
    '유입 경로': params.referrer || '',
    '제출일시': new Date(),
    '제출 페이지': params.page || ''
  }, SUBMIT_HEADERS);
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
      utm_source: 'test',
      utm_medium: 'test',
      utm_campaign: 'test',
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
      utm_source: 'test',
      utm_medium: 'test',
      utm_campaign: 'test',
      page: 'https://example.com/?screen=solution'
    }
  });
}

// e.parameter가 비어 있으면(전송 형식 차이 등) 본문을 직접 해석해 복구한다
function getParams_(e) {
  const p = (e && e.parameter) || {};
  if (Object.keys(p).length > 0) return p;
  try {
    const raw = e && e.postData && e.postData.contents;
    if (raw && raw.indexOf('=') !== -1) {
      const out = {};
      String(raw).split('&').forEach(function (kv) {
        const i = kv.indexOf('=');
        if (i > 0) {
      out[decodeURIComponent(kv.slice(0, i).replace(/\+/g, ' '))] =
        decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' '));
        }
      });
      return out;
    }
  } catch (err) {}
  return p;
}

// 해석 불가/빈 요청을 진단용 탭에 남긴다 (정체 확인용)
function logMalformed_(spreadsheet, e) {
  try {
    const sheet = getSheet_(spreadsheet, '수신 오류', ['시각', '콘텐츠 타입', '원본(앞 500자)']);
    const pd = e && e.postData;
    sheet.appendRow([
      new Date(),
      (pd && pd.type) || '(없음)',
      pd && pd.contents ? String(pd.contents).slice(0, 500) : '(본문 없음)'
    ]);
  } catch (err) {}
}

function getSheet_(spreadsheet, name, headers) {
  const sheet = findSheetByName_(spreadsheet, name) || spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  return sheet;
}

// 탭 이름을 "공백 무시"로 찾아 기존 탭을 재사용합니다.
// 예: "방문 로그"와 "방문로그"를 같은 탭으로 취급 → 공백 차이로 중복 탭이 새로 생기지 않습니다.
function findSheetByName_(spreadsheet, name) {
  // 1) 정확히 일치하는 탭이 있으면 그것을 우선 사용
  const exact = spreadsheet.getSheetByName(name);
  if (exact) return exact;
  // 2) 공백만 다른 탭(방문로그 ↔ 방문 로그)이 있으면 그 탭을 재사용
  const target = normalizeName_(name);
  const sheets = spreadsheet.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (normalizeName_(sheets[i].getName()) === target) return sheets[i];
  }
  return null;
}

function normalizeName_(s) {
  return String(s).replace(/\s+/g, '');
}

/**
 * 시트의 실제 헤더 이름에 값을 맞춰 한 행을 기록합니다.
 * - 기존 시트 열 순서가 코드와 달라도 이름 기준으로 정확히 들어갑니다.
 * - 코드가 채우려는 헤더 중 시트에 없는 열은 맨 뒤에 자동으로 추가합니다.
 * - ALIAS로 과거 헤더 이름을 현재 키에 연결해 중복 열 생성을 막습니다.
 */
function appendRecord_(sheet, record, canonicalHeaders) {
  // 필요한 열 수를 미리 확보한다.
  // 시트의 열 개수가 모자라면 열 추가·기록이 오류로 죽어 그 탭만 통째로 기록이 실패한다.
  ensureColumns_(sheet, canonicalHeaders.length + 5);

  if (sheet.getLastRow() === 0) sheet.appendRow(canonicalHeaders);

  const lastCol = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
    .map(function (h) { return String(h).trim(); });

  // 과거 헤더 → 현재 record 키
  const ALIAS = { '기록 시각': '제출일시', '기록시각': '제출일시', '리퍼러': '유입 경로' };
  function keyFor(h) {
    if (record.hasOwnProperty(h)) return h;
    if (ALIAS[h] && record.hasOwnProperty(ALIAS[h])) return ALIAS[h];
    return null;
  }

  // 이미 (직접 또는 별칭으로) 시트에 존재하는 record 키를 표시
  const covered = {};
  headers.forEach(function (h) { const k = keyFor(h); if (k) covered[k] = true; });

  // 코드에만 있고 시트에 없는 헤더는 맨 뒤에 추가
  canonicalHeaders.forEach(function (h) {
    if (!covered[h]) {
      ensureColumns_(sheet, headers.length + 1);
      sheet.getRange(1, headers.length + 1).setValue(h);
      headers.push(h);
      covered[h] = true;
    }
  });

  const row = headers.map(function (h) {
    const k = keyFor(h);
    return k ? record[k] : '';
  });
  ensureColumns_(sheet, row.length);
  sheet.appendRow(row);
}

// 시트의 열 개수가 부족하면 늘린다
function ensureColumns_(sheet, needed) {
  const max = sheet.getMaxColumns();
  if (needed > max) sheet.insertColumnsAfter(max, needed - max);
}

function json_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
