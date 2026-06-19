export default async function handler(req, res) {
  const { searchdate, data = "AP01" } = req.query;
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const url = new URL("https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON");
  url.searchParams.set("authkey", apiKey);
  url.searchParams.set("data", data);
  if (searchdate) url.searchParams.set("searchdate", searchdate);

  try {
    const response = await fetch(url.toString());
    const json = await response.json();
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.json(json);
  } catch {
    return res.status(500).json({ error: "Failed to fetch exchange rate" });
  }
}
