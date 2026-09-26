# Firehouse GIS

An offline-first parcel wildfire vulnerability & egress viewer, built to
carry the parcel-level vulnerability index from the accompanying
Transactions in GIS / JOSS manuscript out of the notebook and into a tool a
crew can actually run — on a laptop at the firehouse and on a phone with no
signal in the field.

## Why this stack

- **Next.js 14 (App Router)** — one codebase, deploys free on Vercel for the
  firehouse desktop view, and builds to a standalone PWA for phones/tablets
  in trucks.
- **MapLibre GL JS** — open-source, no API key, renders vector/raster tiles
  and your parcel GeoJSON client-side. No vendor lock-in for a volunteer
  department's budget.
- **Dexie.js (IndexedDB)** — every parcel's vulnerability score, egress
  flag, and hydrant distance is cached on-device after the first sync, so
  the map, popups, and field notes all work with the radio on and the data
  signal off.
- **next-pwa** — service worker caches the app shell, map tiles, and the
  `/api/vulnerability` response so the tool installs like a native app
  ("Add to Home Screen") and opens instantly, offline, at the next incident.

## Running it

```bash
npm install
npm run dev       # http://localhost:3000
```

`npm run build && npm start` for a production server (or `vercel deploy`).

On first load with a connection, the map calls `/api/vulnerability`, scores
parcels, and caches the result in IndexedDB. After that, toggling airplane
mode (or driving out of coverage) still shows the last-synced layer — the
status badge in the top-left switches from "● Online" to "● Offline —
showing cached layer."

## Swapping in real data

The app ships with `synthesizeParcels()` (`lib/vulnerability.ts`) so it runs
end-to-end with no setup, using the same synthetic-but-spatially-coherent
Gatlinburg/Sevier layer as the Python research pipeline. To go live for a
real district:

1. **Parcels** — replace `synthesizeParcels()` with a query against your
   parcel table (Postgres + PostGIS is the natural fit; a `geojson` column
   or `ST_AsGeoJSON` export both work) in
   `app/api/vulnerability/route.ts`.
2. **Roads/egress** — compute `dist_to_road_m`, `dead_end_score`, and
   `dist_station_m` once offline (e.g., with `networkx`/`osmnx` as in the
   manuscript's Python pipeline, or PostGIS `pgRouting`) and store them as
   parcel attributes rather than recomputing per request.
3. **Hydrants** — join `dist_hydrant_m` from a hydrant layer (public-records
   request or department GIS) instead of the synthetic elevation proxy.
4. **Vegetation/fuel** — replace the slope/aspect proxy with a real
   NAIP/Sentinel-2-derived fuel layer, sampled per parcel.
5. Re-deploy — the weighting logic (`scoreParcel`) and UI need no changes;
   `w_egress`/`w_water`/`w_veg`/`w_terrain` query params already let a chief
   run a sensitivity pass (matching the manuscript's tunable-weights
   methods contribution) straight from the field.

## Field workflow

- **Tap a parcel** → popup shows vulnerability class, egress score
  (flagging dead-ends), nearest hydrant distance, and fuel score.
- **"+ Field note"** → logs a geotagged note to IndexedDB immediately;
  syncs to `/api/notes` automatically the next time the device is online
  (`lib/db.ts: flushFieldNotes`).
- **Dead-end markers** (purple dots) surface single-access parcels at a
  glance — the same egress metric used in the policy manuscript's
  secondary-egress-rule analysis.

## Firehouse vs. field

The same deployment serves both: on the firehouse desktop/dashboard it's a
planning and pre-incident-briefing map (full basemap, live sync, incident
overlay stub in `app/api/incidents`); installed on a phone via "Add to Home
Screen" it becomes an offline field reference. No separate app to maintain.

## Still to wire up for production

- Auth (NextAuth or your department's SSO) before deploying beyond a pilot.
- A real incident feed in `app/api/incidents/route.ts` (CAD export,
  NIFC/InciWeb, or a local dispatch API).
- Persisting field notes server-side in `app/api/notes/route.ts`.
- PMTiles/MBTiles self-hosted basemap tiles if you need guaranteed offline
  coverage of a whole district rather than opportunistically cached OSM
  tiles (the raster source in `components/VulnerabilityMap.tsx` is a drop-in
  swap).
# FireHazard
