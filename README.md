# Bolt.New Investment Agent Backend (Beginner Friendly)

This is a tiny Node.js service your Bolt.New agent can call to fetch **filings**, **prices**, and **news**.

## What you need
- Node 18+ (the host provides this for you)
- API keys:
  - `SEC_API_KEY` from https://sec-api.io (filings)
  - `FINNHUB_API_KEY` from https://finnhub.io (prices + news)

## Quick Deploy (Render.com or Railway.app)
1) Create a new Web Service.
2) Add environment variables:
   - `SEC_API_KEY=...`
   - `FINNHUB_API_KEY=...`
   - `PORT=8080`
3) Deploy. After it's live, test:
   - `GET /healthz` → `{ ok: true }`

## Endpoints
- `POST /filings/search` → body: `{ "ticker":"AAPL", "forms":["10-K","10-Q"], "limit":3 }`
- `POST /market/ohlcv` → body: `{ "ticker":"AAPL", "start":"2025-01-01", "end":"2025-11-10" }`
- `POST /news/search` → body: `{ "ticker":"AAPL", "days":30 }`

## Example cURL
```bash
curl -X POST https://YOUR-APP/filings/search       -H 'Content-Type: application/json'       -d '{"ticker":"AAPL","forms":["10-K","10-Q"],"limit":3}'
```

## Next step (optional)
Add an `/xbrl/normalize` endpoint using **Arelle** to compute revenue/FCF/ROIC directly from SEC filings.
