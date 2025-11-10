// Minimal backend for Bolt.New — ready to deploy on Render/Railway
// Requires Node 18+
import express from 'express';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());

const SEC_API_KEY = process.env.SEC_API_KEY || "";
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || "";

app.get('/healthz', (req, res) => res.json({ ok: true }));

// Helper: basic fetch with error handling
async function fetchJson(url, options = {}) {
  const r = await fetch(url, options);
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status} ${r.statusText}: ${txt}`);
  }
  return r.json();
}

// 1) Filings search (SEC-API) — returns a compact list
app.post('/filings/search', async (req, res) => {
  try {
    const { ticker, forms = ["10-K","10-Q","8-K"], limit = 5 } = req.body || {};
    if (!ticker) return res.status(400).json({ error: 'ticker is required' });
    if (!SEC_API_KEY) return res.status(500).json({ error: 'Server missing SEC_API_KEY' });

    const url = 'https://api.sec-api.io/filings';
    const query = {
      query: { query_string: { query: `ticker:${ticker} AND (formType:${forms.join(' OR formType:')})` } },
      from: 0,
      size: limit,
      sort: [{ filedAt: { order: 'desc' } }]
    };

    const data = await fetchJson(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': SEC_API_KEY },
      body: JSON.stringify(query)
    });

    const results = (data?.filings || []).map(f => ({
      source: 'SEC-API',
      companyName: f?.companyName,
      ticker,
      filingType: f?.formType,
      filedAt: f?.filedAt,
      accession: f?.accessionNo,
      url: f?.linkToFiling
    }));

    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2) Market OHLCV — Finnhub daily candles
app.post('/market/ohlcv', async (req, res) => {
  try {
    const { ticker, start, end } = req.body || {};
    if (!ticker || !start || !end) return res.status(400).json({ error: 'ticker, start, end are required (YYYY-MM-DD)' });
    if (!FINNHUB_API_KEY) return res.status(500).json({ error: 'Server missing FINNHUB_API_KEY' });

    const resolution = 'D';
    const fromUnix = Math.floor(new Date(start).getTime() / 1000);
    const toUnix = Math.floor(new Date(end).getTime() / 1000);

    const u = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(ticker)}&resolution=${resolution}&from=${fromUnix}&to=${toUnix}&token=${FINNHUB_API_KEY}`;
    const d = await fetchJson(u);

    if (d.s !== 'ok') return res.json({ ticker, ohlcv: [] });

    const ohlcv = d.t.map((t, i) => ({
      t: new Date(t * 1000).toISOString().slice(0, 10),
      o: d.o[i], h: d.h[i], l: d.l[i], c: d.c[i], v: d.v[i]
    }));

    res.json({ ticker, ohlcv });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 3) News (recent) — Finnhub company news
app.post('/news/search', async (req, res) => {
  try {
    const { ticker, days = 30 } = req.body || {};
    if (!ticker) return res.status(400).json({ error: 'ticker is required' });
    if (!FINNHUB_API_KEY) return res.status(500).json({ error: 'Server missing FINNHUB_API_KEY' });

    const to = new Date();
    const from = new Date(Date.now() - days * 86400000);
    const iso = (d) => d.toISOString().slice(0, 10);

    const u = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}&from=${iso(from)}&to=${iso(to)}&token=${FINNHUB_API_KEY}`;
    const arr = await fetchJson(u);

    const news = (arr || []).map(n => ({
      source: n.source,
      headline: n.headline,
      published_at: new Date(n.datetime * 1000).toISOString(),
      url: n.url
    }));

    res.json({ ticker, news });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Placeholder for XBRL normalize (advanced; add with Arelle later)
app.post('/xbrl/normalize', async (req, res) => {
  res.status(501).json({ error: 'Not implemented yet. Your backend works; XBRL parsing is an optional upgrade.' });
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Backend running on :${port}`));
