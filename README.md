# Lead Scanner

A Next.js and TypeScript portfolio project for exploring local businesses with a recorded phone number and **no website recorded in the data source**. It combines interactive maps, provider adapters, bounded API requests, and CSV, JSON, and Excel exports.

Missing website data is a prospecting signal, not proof that a business has no website. Phone numbers are unverified. Public data can be stale or incomplete.

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Leaflet/react-leaflet, and ExcelJS. Node’s test runner covers API and utility behavior; Playwright covers browser flows.

## Run locally

Requires Node.js 24 and npm. Run the following commands from the repository root after cloning it.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000, then launch the scanner at `/scan`.

For a reliable demonstration, check **Use mock data** before scanning, or set `DATA_PROVIDER=mock`. Demo results are clearly labeled fictional; never contact those numbers. Map tiles still require internet access. Live provider failures return an error and never substitute demo leads.

## Features

- Terminal-inspired responsive interface with reduced-motion support
- Click the map to choose a radius center; optional browser GPS
- Numbered business pins, zoom-dependent grouping, and map details linked to result cards
- Searchable, scrollable lead cards with a saved-only filter
- Up to five scan zones, with deduplication for live results
- US state queries through Overpass
- Saved lead selection in local storage; exports use selected leads when any are saved
- CSV with formula protection, JSON, and Excel exports
- Explicit demo mode and inline scan/export errors
- Server-side input validation, body limits, request budgets, deadlines, and bounded caching

## Use the scanner

1. Open `/scan` and enter a business category, such as `plumbers` or `dentists`.
2. Choose a radius and click the map to set its center, enable **MULTI** to add up to five zones, or select a US state.
3. Enable **Use mock data** for a demonstration, then click **SCAN**.
4. Select **SAVE** on individual rows to export a subset. If nothing is selected, the export includes all current results.
5. Choose CSV, JSON, or XLSX from **EXPORT**. **CLR** clears results and zones.

Each multi-zone chip shows its stored radius and a remove control. Changing the radius affects new zones only. At least one visible zone is required to scan.

GPS requires browser permission and a secure context, such as HTTPS or localhost. Choosing a point on the map works without location access.

## Data and limits

The default provider queries public OpenStreetMap Overpass endpoints without an API key. These services can be busy, rate-limited, or unavailable. Radius queries are limited to 1–50 miles and latitudes between −85 and 85 degrees. Scans have a 45-second upstream budget; each Overpass attempt has an 18-second timeout. Multi-zone scans run sequentially and may fail if the overall budget expires.

Each Overpass query retrieves at most 500 source records **before** filtering. Combined live results and exports are capped at 500 leads. State searches are not exhaustive. Results are cached for 5 minutes (radius) or 10 minutes (state), with at most 250 cache entries per process.

Scan requests are limited to 8 KiB and exports to 2 MB. A conservative per-process request budget permits 10 scans and 30 exports per minute across all visitors. This is an application backstop, not a distributed rate limiter: for public multi-instance hosting, configure a shared hosting/WAF rate limit. Forwarded client-IP headers are deliberately not trusted.

Saved selections persist identifiers only, not the lead database. Refreshing clears scan results. Storage may be unavailable in some browsers; selection still works for the current visit.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATA_PROVIDER` | `overpass` | `overpass`, `mock`, or `google` |
| `ENABLE_PAID_PROVIDER` | `false` | Must be `true` to enable potentially billable Google requests |
| `GOOGLE_PLACES_API_KEY` | unset | Server-only key, required when using Google |

Google supports radius and multi-zone scans only. It uses up to 20 places per zone and one details request per place. Results are limited and do not include all search pages. Restrict the key and configure provider quotas before enabling it. State-wide Google scans are disabled. The default provider requires no paid business-data account; hosting costs still apply.

## Architecture

- `app/api/scan`: validates requests, applies budgets and cancellation, invokes a provider
- `lib/providers`: Overpass, explicit mock, and optional Google adapters
- `lib/categories`: category matching and escaped Overpass filters
- `lib/validation`: runtime validation for scans and exports
- `lib/export`: CSV, JSON, and Excel generation
- `components`: map, controls, result selection and downloads
- `tests`: regression coverage for API failures, validation, query escaping, export safety, cache bounds, and request limits

## Verify

Run static checks and regression tests:

```bash
npm run check
```

Build the production app, install the test browser, and run browser checks:

```bash
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright starts and stops a production server on `127.0.0.1:3100`; you do not need to run `npm start` separately. On Linux, use `npx playwright install --with-deps chromium` if browser system dependencies are missing. To use an installed Google Chrome browser instead, set `PLAYWRIGHT_CHROME_CHANNEL=chrome`.

`check` runs ESLint, TypeScript, and Node regression tests. Browser tests cover radius selection, explicit demo results, all three export formats, mode switching, empty results, live errors, and mobile navigation. They stub selected responses and map tiles to avoid relying on third-party availability; they do not verify live provider coverage or credentials.

GitHub Actions runs checks, the production build, a dependency audit, and browser tests on pushes and pull requests. Typography uses system fonts so builds do not depend on Google Fonts availability.

Before publishing, also exercise real multi-zone and state queries, GPS denial, and your hosting configuration. Automated checks do not guarantee upstream availability.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Live scan fails | Public Overpass endpoints may be busy. Retry later, reduce the area or number of zones, or explicitly select demo mode. |
| Scan returns no leads | Try another category or area. Missing results can reflect incomplete source data and filtering. |
| Map tiles do not load | Check internet access and browser/network restrictions on tile.openstreetmap.org. The map shows a retry control when tile loading fails. |
| GPS is unavailable | Use HTTPS or localhost, check location permissions, or click the map instead. |
| Requests return HTTP 429 | Wait one minute. The process-wide request budget is shared by all visitors. |
| Google scans fail | Check all three provider environment settings, API access, key restrictions, billing, and quotas. |
| Browser tests cannot start | Build first, install Chromium, and check that port 3100 is available. |

## Deploy

Deploy to a Node.js host supporting Next.js and route durations of at least 60 seconds. Build with `npm run build`, run with `npm start`. Keep API keys in server-side environment variables. The app does not require a database. In-memory cache and request budgets are process-local and reset on restarts.

Privacy and usage information are available at `/privacy` and `/terms`; review them against your actual hosting/logging setup before publishing.

## Attribution and license

Application code: [MIT](LICENSE). OpenStreetMap data: [Open Database License](https://www.openstreetmap.org/copyright). Map tiles: [OpenStreetMap Standard](https://operations.osmfoundation.org/policies/tiles/), displayed with a CSS dark treatment. Public tiles have limited capacity and no availability guarantee; review the tile policy before public deployment. Preserve provider attribution and review provider terms before redistributing data.
