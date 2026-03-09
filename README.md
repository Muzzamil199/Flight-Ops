# Flight Ops — Business Aviation Fuel Stop Planner

> Evaluate fuel stops for any business jet in under 90 seconds.

[Watch the demo](#) <!-- Paste your Loom link here -->

---

## What It Does

Flight Ops is a web tool for business aviation operators to quickly identify and evaluate potential fuel stops along a route. Given a departure airport and aircraft performance data, it:

- Draws a **range ring** on a live Mapbox map showing how far the aircraft can reach
- Colors every airport on the map by **cheapest fuel price** (green → red scale)
- Runs **Find Stops** to score and rank all airports within range by fuel cost, warnings, and feasibility
- Opens a **detail panel** for any airport showing elevation, runway, warnings (curfew, permits, PPR, noise), operational info, available handlers, and a per-provider fuel price breakdown
- Lets you build a **candidate shortlist** as a pinned card strip at the bottom of the map
- Evaluates **active warnings** against your flight context (international vs domestic, revenue charter, departure time) so only relevant warnings surface

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Map | Mapbox GL JS v3 |
| Styling | Tailwind CSS v4, shadcn/ui |
| Database | PostgreSQL (Docker), Prisma ORM |
| Geo math | @turf/turf (range circles, point-in-polygon) |

---

## Setup

### Prerequisites
- Node.js 20+
- Docker (for PostgreSQL)
- A free [Mapbox account](https://account.mapbox.com/) for an API token

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/businessaviation-mvp.git
cd businessaviation-mvp
npm install
```

### 2. Environment variables

Create a `.env.local` file in the project root (this file is git-ignored):

```
DATABASE_URL="postgresql://bizav:bizav@localhost:5432/bizavdb"
NEXT_PUBLIC_MAPBOX_TOKEN="pk.YOUR_MAPBOX_PUBLIC_TOKEN_HERE"
```

Get your Mapbox public token at: [https://account.mapbox.com/access-tokens/](https://account.mapbox.com/access-tokens/)

### 3. Start the database

```bash
docker run -d \
  --name bizav-db \
  -e POSTGRES_USER=bizav \
  -e POSTGRES_PASSWORD=bizav \
  -e POSTGRES_DB=bizavdb \
  -p 5432:5432 \
  postgres:16
```

### 4. Run migrations and seed

```bash
npx prisma migrate deploy
npx prisma db seed
```

This seeds ~75 airports across Europe, North America, and the Middle East with:
- Fuel prices from 3 mock providers (Everest Aviation, World Fuel Services, Avfuel)
- ~120 operational warnings (curfews, permits, PPR requirements, noise limits, handler info)
- Airport operations data (customs hours, slots, FBO handlers)

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## How to Use

1. **Enter a departure ICAO** (e.g. `KTEB`, `EGLL`, `OMDB`) — a range ring appears on the map
2. **Select an aircraft type** or enter custom fuel / burn rate / speed figures
3. Airports are **color-coded by cheapest fuel price** — hover any airport for a quick summary tooltip
4. Click **Find Stops** to score all airports within range — non-candidates dim, ranked candidates are highlighted green / amber / red by feasibility
5. Click any airport marker to open its **detail panel** (warnings, fuel prices, operations info)
6. Click **+ Candidate** in the panel to pin it to your shortlist
7. Build a multi-stop shortlist as cards at the bottom of the screen — click any card to reopen its detail panel

---

## What's Not in This Version

This is a v1 proof-of-concept. A production-ready v2/v3 would add:

### Range & Performance
- **Winds aloft integration** — use actual forecast wind data at cruise altitude, not a single headwind input
- **Phase-based fuel burn** — model takeoff, climb, cruise, descent, and landing fuel burns separately
- **ETOPS / extended range routing** — account for en-route diversion requirements
- **Route waypoints** — great-circle routing via actual waypoints rather than straight-line distance

### Planning
- **Multi-stop trip planner** — enter a full route (e.g. `KBED → EINN → EGLL → LSGS`) and evaluate each leg end-to-end
- **Alternate airport suggestions** — automatically propose alternates meeting regulatory requirements
- **Weather overlays** — METAR/TAF data on the map to flag VMC/IMC conditions at each candidate
- **NOTAMs integration** — surface active NOTAMs for each candidate airport

### Operations
- **Handler booking** — request ground handling and slots directly from the detail panel
- **Admin portal** — UI for operators to add/edit airport warnings, handling costs, and operational notes
- **Real-time fuel prices** — live feed integration (Avinode, World Fuel, or equivalent APIs)
- **Cost comparison export** — generate a formatted PDF stop-comparison sheet for trip approval

### Auth & Multi-user
- **Operator accounts** — save aircraft profiles, preferred handlers, fuel card settings
- **Trip history** — log completed stops and actual fuel costs for expense reporting
- **Team sharing** — share candidate shortlists with crew and dispatch

---

## Project Structure

```
app/
  page.tsx                        # Root layout and shared state
  api/
    airports/route.ts             # GeoJSON feed for map (all airports)
    airports/[id]/route.ts        # Airport detail
    airports/[id]/warnings/       # Active warnings for an airport
    airports/[id]/fuel/           # Fuel price breakdown
    stop-evaluation/route.ts      # POST: score airports within range

components/
  AircraftInputSidebar.tsx        # Left sidebar: aircraft inputs + Find Stops
  Map.tsx                         # Mapbox GL map + interactions
  AirportDetailPanel.tsx          # Right panel: airport detail on click
  CandidateStopCards.tsx          # Bottom strip: shortlisted candidate airports
  WarningList.tsx                 # Warning items for a given airport
  WarningBadge.tsx                # Individual warning pill (type, category, cost)
  FuelBreakdown.tsx               # Per-provider fuel price table
  FilterControls.tsx              # Warning type + category filter checkboxes

lib/
  types.ts                        # All shared TypeScript interfaces
  fuelCalculator.ts               # Effective price after card discount, range NM
  rangeCalculator.ts              # Turf.js range circle + point-in-polygon
  warningEvaluator.ts             # Evaluate warning triggers vs flight context
  mapLayers.ts                    # Mapbox layer specifications

prisma/
  schema.prisma                   # Database schema
  seed.ts                         # Airport, warning, and fuel price seed data
```

---

## License

MIT
