import { fetchExchangeRates } from "./_koreaexim.js";

export default async function handler(req, res) {
  const { searchdate, data = "AP01" } = req.query;
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;

  res.setHeader("Access-Control-Allow-Origin", "*");

  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const json = await fetchExchangeRates({ authkey: apiKey, data, searchdate });
    return res.json(json);
  } catch (error) {
    return res.status(502).json({ error: error?.message ?? "Failed to fetch exchange rate" });
  }
}
