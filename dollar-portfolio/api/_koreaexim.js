import https from "node:https";
import tls from "node:tls";

const API_HOST = "https://oapi.koreaexim.go.kr";
const API_PATH = "/site/program/financial/exchangeJSON";
const REQUEST_TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 3; // WAF의 302/연결 끊김이 간헐적이라 쿠키를 새로 받아 재시도

/**
 * oapi.koreaexim.go.kr는 리프 인증서만 내려주고 중간 CA를 체인에 포함하지 않는다.
 * 브라우저/curl은 캐시된 중간 CA로 검증에 성공하지만 Node는 실패하므로
 * (UNABLE_TO_VERIFY_LEAF_SIGNATURE) 중간 CA를 직접 신뢰 목록에 추가한다.
 * Thawte TLS RSA CA G1 (issuer: DigiCert Global Root G2), 만료 2027.11.02
 */
const THAWTE_TLS_RSA_CA_G1 = `-----BEGIN CERTIFICATE-----
MIIEizCCA3OgAwIBAgIQCQ7oxd5b+mLSri/3CXxIVzANBgkqhkiG9w0BAQsFADBh
MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3
d3cuZGlnaWNlcnQuY29tMSAwHgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBH
MjAeFw0xNzExMDIxMjI0MjVaFw0yNzExMDIxMjI0MjVaMF4xCzAJBgNVBAYTAlVT
MRUwEwYDVQQKEwxEaWdpQ2VydCBJbmMxGTAXBgNVBAsTEHd3dy5kaWdpY2VydC5j
b20xHTAbBgNVBAMTFFRoYXd0ZSBUTFMgUlNBIENBIEcxMIIBIjANBgkqhkiG9w0B
AQEFAAOCAQ8AMIIBCgKCAQEAxjngmPhVetC0b/ozbYJdzOBUA1sMog47030cAP+P
23ANUN8grXECL8NhDEF4F1R9tL0wY0mczHaR0a7lYanlxtwWo1s2uGnnyDs6mOCs
66ew2w3YETr6Tb14xgjpu1gGFtAeewaikO9Fud8hxGJTSwn8xeNkfKVWpD2L4vFN
36FNgxeilK6aE4ykgGAzNlokTp6hNOLAYpDySdLAPKzuJSQ7JCEZ6O+SDKywIdXL
oMTnpxuBKGSG88NWTo3CHCOGmQECia2yqdPDjgLqnEiYNjwQL8uMqj8rOvlMgviB
cHA7xty+7/uYLN6ZS7Vq1/F/lVhVOf5ej6jZdmB85szFbQIDAQABo4IBQDCCATww
HQYDVR0OBBYEFKWM/jLM6w8s1BnGCLgAJIhdw8W3MB8GA1UdIwQYMBaAFE4iVCAY
lebjbuYP+vq5Eu0GF485MA4GA1UdDwEB/wQEAwIBhjAdBgNVHSUEFjAUBggrBgEF
BQcDAQYIKwYBBQUHAwIwEgYDVR0TAQH/BAgwBgEB/wIBADA0BggrBgEFBQcBAQQo
MCYwJAYIKwYBBQUHMAGGGGh0dHA6Ly9vY3NwLmRpZ2ljZXJ0LmNvbTBCBgNVHR8E
OzA5MDegNaAzhjFodHRwOi8vY3JsMy5kaWdpY2VydC5jb20vRGlnaUNlcnRHbG9i
YWxSb290RzIuY3JsMD0GA1UdIAQ2MDQwMgYEVR0gADAqMCgGCCsGAQUFBwIBFhxo
dHRwczovL3d3dy5kaWdpY2VydC5jb20vQ1BTMA0GCSqGSIb3DQEBCwUAA4IBAQC6
km0KA4sTb2VYpEBm/uL2HL/pZX9B7L/hbJ4NcoBe7V56oCnt7aeIo8sMjCRWTCWZ
D1dY0+2KZOC1dKj8d1VXXAtnjytDDuPPf6/iow0mYQTO/GAg/MLyL6CDm3FzDB8V
tsH/aeMgP6pgD1XQqz+haDnfnJTKBuxhcpnx3Adbleue/QnPf1hHYa8L+Rv8Pi5U
h4V9FwHOfphdMXOxi14OqmsiTbc5cOs9/uukH+YVsuFdWTna6IVw1qh+tEtyH16R
vmi7pkqyZYULOPMIE7avrljVVBZuikwARtY8tCVV6Pp9l3VeagBqb2ffgqNJt3C0
TYNYQI+BXG1R1cABlold
-----END CERTIFICATE-----`;

const ca = [...tls.rootCertificates, THAWTE_TLS_RSA_CA_G1];

function get(url, cookie) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { ca, headers: cookie ? { Cookie: cookie } : {} }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
    });
    req.on("error", reject);
    req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new Error("환율 API 응답 시간 초과")));
  });
}

/**
 * 수출입은행 환율 API를 조회해 파싱된 JSON 배열을 반환한다.
 * WAF가 첫 요청에 302 + Set-Cookie로 응답하는 경우가 있어 쿠키를 붙여 한 번 재시도한다.
 * 비영업일이면 빈 배열이 내려온다.
 */
export async function fetchExchangeRates({ authkey, data = "AP01", searchdate }) {
  const url = new URL(API_HOST + API_PATH);
  url.searchParams.set("authkey", authkey);
  url.searchParams.set("data", data);
  if (searchdate) url.searchParams.set("searchdate", searchdate);

  let res = null;
  let lastError = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      res = await get(url.toString());
      if (res.status >= 300 && res.status < 400 && res.headers["set-cookie"]) {
        const cookie = res.headers["set-cookie"].map((c) => c.split(";")[0]).join("; ");
        res = await get(url.toString(), cookie);
      }
      if (res.status === 200) break;
      lastError = new Error(`환율 API 응답 오류 (${res.status})`);
    } catch (error) {
      lastError = error;
    }
    res = null;
  }

  if (!res) {
    throw lastError ?? new Error("환율 API 요청에 실패했습니다.");
  }

  const trimmed = res.body.trim();
  if (!trimmed) return [];

  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error("환율 API 응답을 해석할 수 없습니다.");
  }
}

const WEEKS = 52;
const MAX_DAY_LOOKUP_PER_WEEK = 3; // 주별 샘플: 월→화→수 순으로 최대 3영업일 시도
const COLLECT_CONCURRENCY = 8; // 상대 서버 부담과 함수 실행시간(최대 60초)의 절충

function toYyyymmdd(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/** 주어진 날짜가 속한 주의 월요일을 반환한다. */
function mondayOf(date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = result.getDay(); // 0=일 ~ 6=토
  result.setDate(result.getDate() + (day === 0 ? -6 : 1 - day));
  return result;
}

function parseDealBasR(value) {
  const parsed = parseFloat(String(value).replaceAll(",", ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** 응답 배열에서 USD 매매기준율을 꺼낸다. 없거나 비정상이면 null. */
export function extractUsdRate(items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const usd = items.find((item) => item.cur_unit === "USD");
  if (!usd || usd.result !== 1) return null;
  const rate = parseDealBasR(usd.deal_bas_r);
  return rate > 0 ? rate : null;
}

/** 한 주의 대표 환율. 월요일부터 최대 3영업일까지 시도하고 모두 없으면 null. */
async function fetchWeekSample(authkey, weekMonday) {
  for (let offset = 0; offset < MAX_DAY_LOOKUP_PER_WEEK; offset += 1) {
    const candidate = new Date(weekMonday);
    candidate.setDate(candidate.getDate() + offset);
    if (candidate.getTime() > Date.now()) break; // 미래 날짜는 조회하지 않음

    try {
      const items = await fetchExchangeRates({ authkey, searchdate: toYyyymmdd(candidate) });
      const rate = extractUsdRate(items);
      if (rate !== null) return rate;
    } catch {
      // 한 주 실패는 전체를 막지 않는다. 다음 후보일로 넘어간다.
    }
  }
  return null;
}

/** 동시 실행 수를 제한해 작업을 처리한다. */
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

/**
 * 최근 52주의 주간 샘플 USD 환율을 수집한다(과거→현재 순).
 *
 * 수출입은행 키는 일일 1,000회 제한이라 클라이언트가 직접 52주를 조회하면
 * 사용자 몇 명만으로 한도가 소진되고 현재 환율 조회까지 막힌다.
 * 그래서 이 수집은 서버에서만 수행하고 응답을 하루 단위로 캐싱한다.
 */
export async function fetchWeeklyUsdRates({ authkey, weeks = WEEKS }) {
  const thisMonday = mondayOf(new Date());
  const mondays = Array.from({ length: weeks }, (_, i) => {
    const monday = new Date(thisMonday);
    monday.setDate(monday.getDate() - (weeks - 1 - i) * 7);
    return monday;
  });

  const sampled = await mapWithConcurrency(mondays, COLLECT_CONCURRENCY, (monday) =>
    fetchWeekSample(authkey, monday),
  );
  return sampled.filter((rate) => rate !== null);
}
