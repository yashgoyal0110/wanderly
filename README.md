# Wanderly — Trip Planner

A full-stack trip planner built around a colorful, interactive world map.

- **Explore**: a zoomable, pannable world map (react-simple-maps + TopoJSON). Every country has its own color, hovering shows its name and capital, and clicking flies the map into the country and opens a panel with its outline, capital, region, population, area, languages, currency, national dish, climate and neighbours.
- **Search**: autocomplete by country name, capital or alternative spelling ("Nippon", "Holland", "Kyiv"...), with keyboard navigation.
- **Budget check**: enter a budget (any of 18 currencies), trip length, travelers, and optionally where you fly from and your monthly income. The API estimates budget, mid-range and luxury costs from a per-country cost dataset seeded into MongoDB, then tells you whether your money is enough.
- **Plans**: when the budget is enough you get a basic, comfortable or luxury plan with a spending breakdown, a 10% safety buffer and a day-by-day itinerary. When it falls short you see how much more you need, how many days the budget covers, and cheaper nearby countries.
- **AI**: a floating Gemini-powered assistant ("Atlas") that knows how the site works and the country, budget and result you're looking at. You can also generate a personalised AI itinerary. Gemini is only called from the backend.
- **Persistence**: saved plans and every budget search are stored in MongoDB ("My trips" drawer).

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 18, Vite, react-simple-maps, d3-geo, topojson-client, world-atlas |
| Backend | Node.js 18+ (uses built-in `fetch`), Express 5, Mongoose |
| Database | MongoDB (Atlas or local), with an automatic in-memory fallback |
| AI | Google Gemini (`gemini-2.5-flash`) via REST |

## Project layout

```
trip-planner/
├── backend/
│   ├── src/
│   │   ├── server.js          # Express app + startup
│   │   ├── db.js              # Mongoose models, seeding, in-memory fallback repo
│   │   ├── estimate.js        # Cost estimation, verdicts, plans, alternatives
│   │   ├── gemini.js          # Gemini REST client (server-side only)
│   │   ├── seed.js            # `npm run seed` – (re)seed cost profiles
│   │   ├── routes/            # countries, trips, chat
│   │   └── data/              # countries.json, cost model, currency rates
│   ├── scripts/build-countries.js  # regenerates data/countries.json from open datasets
│   └── .env.example
└── frontend/
    └── src/
        ├── App.jsx
        ├── components/        # WorldMap, SearchBar, CountryPanel, BudgetForm, BudgetResult, ChatWidget, TripsDrawer...
        └── lib/               # api client, geo helpers
```

## Setup

Prerequisites: Node.js 18+ and npm. MongoDB is optional (see fallback below).

```bash
# 1. Install everything
npm run install:all

# 2. Configure secrets (never commit backend/.env)
cp backend/.env.example backend/.env
#    then edit backend/.env and set MONGODB_URI and GEMINI_API_KEY

# 3. Run API (http://localhost:5000) and web app (http://localhost:5173) together
npm run dev
```

Or run them separately:

```bash
cd backend && npm run dev      # API on :5000
cd frontend && npm run dev     # Vite on :5173, proxies /api to :5000
```

Open http://localhost:5173.

`npm run build` installs both packages and writes the static site to `dist/`. The `api/` folder exports web `Request` handlers (`GET` / `POST` / `DELETE`) for hosts that do not run the Express process. Express in `backend/` remains the local API.

### Environment variables (`backend/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | recommended | MongoDB connection string (Atlas `mongodb+srv://...` or `mongodb://127.0.0.1:27017`) |
| `MONGODB_DB` | no | Database name (default `trip_planner`) |
| `GEMINI_API_KEY` | for AI features | Google AI Studio API key |
| `GEMINI_MODEL` | no | Default `gemini-2.5-flash` |
| `PORT` | no | API port (default `5000`) |
| `CORS_ORIGIN` | no | Comma-separated allowed origins (default: any) |

The frontend reads `VITE_API_URL` if you host the API on a different origin; in development Vite proxies `/api` to the backend (override with `VITE_API_PROXY`).

### Seeding

On startup the API seeds the `costprofiles` collection automatically if it is empty (one document per country, 249 total). To force a re-seed after changing `src/data/costModel.js`:

```bash
npm run seed
```

### Fallbacks

- **MongoDB unreachable**: the API logs a warning and switches to an in-memory store (cost data is still generated; saved trips last until restart). `GET /api/health` reports `"db": "memory"` and the header shows "Offline store".
- **Gemini unreachable or no key**: the chat widget and the AI itinerary show a friendly error; everything else keeps working.

## API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | DB mode and whether Gemini is configured |
| GET | `/api/countries?q=` | All countries, or the top 10 matches for `q` |
| GET | `/api/countries/:cca3` | Country details plus its cost profile |
| POST | `/api/trips/estimate` | `{ cca3, budget, currency, days, travelers, originCca3?, income? }` → verdict, tier totals, plan or shortfall/alternatives (also logged as a search) |
| POST | `/api/trips/itinerary/ai` | Gemini-generated itinerary |
| GET | `/api/trips?kind=plan\|search` | Saved plans / recent searches |
| POST | `/api/trips` | Save a plan `{ result, title?, notes? }` |
| DELETE | `/api/trips/:id` | Delete a saved plan |
| POST | `/api/chat` | `{ messages: [{role, content}], context }` → `{ reply }` |

## How the estimate works

Each country has a **cost index** (1.0 ≈ a mid-priced Western European destination) derived from per-country overrides or subregion defaults. Daily costs per tier (accommodation per room of two, plus food, transport and activities per person) are scaled by that index. Flights use a regional average, or a distance-based estimate from the "flying from" country's capital. Your budget is converted to USD with static rates and compared against the three tier totals:

- below budget tier → **insufficient** (shortfall, affordable days, cheaper nearby countries)
- budget → mid → **basic** plan
- mid → luxury → **comfortable** plan
- at or above luxury → **luxury** plan

Any surplus beyond the chosen tier is spread across categories, with 10% kept as contingency. All figures are rough planning estimates.

## Data sources

Country metadata comes from [`world-countries`](https://github.com/mledoze/countries), capital coordinates from `capitals-coordinates`, and population, national dish, government and climate from `country-json`. Map shapes come from Natural Earth via [`world-atlas`](https://github.com/topojson/world-atlas). Run `npm --prefix backend run build:countries` to regenerate `backend/src/data/countries.json`.
