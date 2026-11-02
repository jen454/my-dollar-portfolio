import https from "node:https";
import tls from "node:tls";

const API_HOST = "https://oapi.koreaexim.go.kr";
const API_PATH = "/site/program/financial/exchangeJSON";
const REQUEST_TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 3; // WAF의 302/연결 끊김이 간헐적이라 쿠키를 새로 받아 재시도
const TOTAL_BUDGET_MS = 9000; // vercel.json의 maxDuration(10초)보다 짧아야 502로 정상 응답할 수 있다
const MIN_ATTEMPT_MS = 500; // 남은 시간이 이보다 적으면 재시도해도 성공할 가능성이 없다

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

function get(url, cookie, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { ca, headers: cookie ? { Cookie: cookie } : {} }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        clearTimeout(timer);
        resolve({ status: res.statusCode ?? 0, headers: res.headers, body });
      });
      // 본문을 받는 중에 끊기면 req가 아니라 res에서 에러가 난다.
      res.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
    // req.setTimeout은 유휴 시간만 재므로 응답이 조금씩 오면 멈추지 않는다. 전체 시간을 직접 잰다.
    const timer = setTimeout(
      () => req.destroy(new Error("환율 API 응답 시간 초과")),
      timeoutMs,
    );
    req.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function parseBody(body) {
  const trimmed = body.trim();
  if (!trimmed) return [];
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error("환율 API 응답을 해석할 수 없습니다.");
  }
}

/**
 * 수출입은행 환율 API를 조회해 파싱된 JSON 배열을 반환한다.
 * WAF가 첫 요청에 302 + Set-Cookie로 응답하는 경우가 있어 쿠키를 붙여 한 번 재시도한다.
 * 재시도를 포함한 전체 시간은 TOTAL_BUDGET_MS 안에서 끝내 함수가 강제 종료되지 않게 한다.
 * 비영업일이면 빈 배열이 내려온다.
 */
export async function fetchExchangeRates({ authkey, data = "AP01", searchdate }) {
  const url = new URL(API_HOST + API_PATH);
  url.searchParams.set("authkey", authkey);
  url.searchParams.set("data", data);
  if (searchdate) url.searchParams.set("searchdate", searchdate);

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const nextTimeout = () => Math.min(REQUEST_TIMEOUT_MS, deadline - Date.now());
  let lastError = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    if (nextTimeout() < MIN_ATTEMPT_MS) break;
    try {
      let res = await get(url.toString(), undefined, nextTimeout());
      if (res.status >= 300 && res.status < 400 && res.headers["set-cookie"]) {
        const cookie = res.headers["set-cookie"].map((c) => c.split(";")[0]).join("; ");
        res = await get(url.toString(), cookie, nextTimeout());
      }
      if (res.status === 200) return parseBody(res.body);
      lastError = new Error(`환율 API 응답 오류 (${res.status})`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("환율 API 요청에 실패했습니다.");
}
