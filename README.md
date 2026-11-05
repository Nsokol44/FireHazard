# FireHazard

One repository and one tool, built to stay useful where there is no
internet: a parcel-level wildfire vulnerability index for any US
county, carried out of the research pipeline and into the firehouse
and the field.

- **Firehouse GIS** (the web app in this repo) is the offline-first
  viewer: a Next.js PWA that caches parcel scores, egress flags and
  hydrant distances on the device and keeps working in airplane mode.
- **FireScore** (`engine/`) is the Python engine that computes the
  scores from free national data. One online fetch builds the county
  cache; every run after that is fully offline, and its FireView
  export is a self-contained map package for a phone with no signal.

The viewer displays what the engine computes.

## Firehouse GIS: the viewer

An offline-first parcel wildfire vulnerability & egress viewer, built to
carry the parcel-level vulnerability index from the accompanying
Transactions in GIS / JOSS manuscript out of the notebook and into a tool a
crew can actually run — on a laptop at the firehouse and on a phone with no
signal in the field.

### Why this stack

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

### Running it

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

### Swapping in real data

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
   the FireScore engine in `engine/`, or PostGIS `pgRouting`) and store them as
   parcel attributes rather than recomputing per request.
3. **Hydrants** — join `dist_hydrant_m` from a hydrant layer (public-records
   request or department GIS) instead of the synthetic elevation proxy.
4. **Vegetation/fuel** — replace the slope/aspect proxy with a real
   NAIP/Sentinel-2-derived fuel layer, sampled per parcel.
5. Re-deploy — the weighting logic (`scoreParcel`) and UI need no changes;
   `w_egress`/`w_water`/`w_veg`/`w_terrain` query params already let a chief
   run a sensitivity pass (matching the manuscript's tunable-weights
   methods contribution) straight from the field.

### Field workflow

- **Tap a parcel** → popup shows vulnerability class, egress score
  (flagging dead-ends), nearest hydrant distance, and fuel score.
- **"+ Field note"** → logs a geotagged note to IndexedDB immediately;
  syncs to `/api/notes` automatically the next time the device is online
  (`lib/db.ts: flushFieldNotes`).
- **Dead-end markers** (purple dots) surface single-access parcels at a
  glance — the same egress metric used in the policy manuscript's
  secondary-egress-rule analysis.

### Firehouse vs. field

The same deployment serves both: on the firehouse desktop/dashboard it's a
planning and pre-incident-briefing map (full basemap, live sync, incident
overlay stub in `app/api/incidents`); installed on a phone via "Add to Home
Screen" it becomes an offline field reference. No separate app to maintain.

### Still to wire up for production

- Auth (NextAuth or your department's SSO) before deploying beyond a pilot.
- A real incident feed in `app/api/incidents/route.ts` (CAD export,
  NIFC/InciWeb, or a local dispatch API).
- Persisting field notes server-side in `app/api/notes/route.ts`.
- PMTiles/MBTiles self-hosted basemap tiles if you need guaranteed offline
  coverage of a whole district rather than opportunistically cached OSM
  tiles (the raster source in `components/VulnerabilityMap.tsx` is a drop-in
  swap).

## FireScore: the engine (`engine/`)

FireScore scores **every structure in any US county** for wildfire
vulnerability from free national data, in one command:

```bash
pip install -e engine/
firescore run --county "Sevier, TN"
firescore run --county "Sevier, TN" --offline   # same result, no network
```

### What it computes

| Component | Source |
|---|---|
| Structures | FEMA USA Structures footprints (a parcel proxy, labelled as such), or real county parcels as an override |
| Egress | exit counts per structure cluster on the real OpenStreetMap road graph, dead-end indicator, drive-time station distance (Dijkstra) |
| Water | OSM hydrants where mapped; otherwise OSM water-feature draft sites, labelled PROXY |
| Vegetation | LANDFIRE FBFM40 fuel models plus distance to wildland |
| Terrain | USGS 3DEP slope plus wind-aligned exposure against a configurable downslope wind |
| Spacing | structure-to-structure nearest-neighbour distance (house-to-house spread) |

Weights, thresholds and costs live in a versioned YAML config, and
each score is reported as a **range** across five weight-sensitivity
configurations, not a bare point value. Practitioner outputs: a
what-if editor (clear vegetation, add a hydrant, add a second exit;
ranked by score drop per $1,000), one-page PDF report cards per
structure, a worst-first inspection queue, and the **FireView**
offline field package (GeoPackage plus a self-contained HTML map).
QGIS and ArcGIS Pro wrappers live in `engine/plugins/`. The manual
is in `engine/docs/` (start with `engine/docs/quickstart.md` and
`engine/docs/offline.md`); the engine's own README is
`engine/README.md`.

### The offline contract

`firescore fetch` runs **once, somewhere with a connection**, and
populates a per-county cache: vectors as GeoParquet, rasters as
GeoTIFF, and a manifest recording the source and retrieval time of
every layer. After that, `run`, `validate`, `whatif`, `report`,
`queue` and `export` never touch the network. `--offline` makes the
guarantee explicit: a missing layer fails loudly, naming the layer,
instead of reaching out.

### Validation, stated plainly

The governing validation is a multi-event design on real incident
files (NASF / FPA-FOD 2013-2022 and Tennessee fiResponse 2020-2026;
208 harmonised Sevier County events), using the three structures
outcomes those files carry: **destroyed** is the primary outcome,
the **damaged-or-destroyed** loss-affected total is reported
alongside it, and **threatened** is an exposure indicator only and
is never pooled with either damage category. On the delivered
extracts the damaged field is not carried, so the loss-affected
endpoint equals the destroyed-only endpoint by absence (20 events
with destroyed structures; 2,686 structures destroyed; threatened
exposure total 1,129). The mean score does not separate destroyed
from non-destroyed events in that set (0.42 vs 0.46), and the docs
say so: the design makes the index testable, it does not manufacture
a structure-loss claim. Perimeter AUCs are reported as diagnostics
only, never as a validation claim. Full detail:
`engine/docs/validation.md`.

### Reference runs

- **Sevier County, TN:** 75,227 structures scored fully offline in
  about 90 seconds, bit-for-bit deterministic across reruns.
- **Blount County, TN:** 79,056 structures on the same code and the
  default config, unmodified — the portability check.

## The software paper

The accompanying paper (`paper.md`, bibliography `paper.bib`) is a
draft for the *Journal of Open Source Software*, describing the
engine and the viewer as one software project. To cite the software,
use `CITATION.cff`.

## License

MIT (see `LICENSE`). Data products keep their own terms; the engine
cache manifest records the source of every layer.
