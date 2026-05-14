# geojson-lab

[![CI](https://github.com/gabriel-n-carvalho/geojson-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/gabriel-n-carvalho/geojson-lab/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-22-339933?logo=node.js&logoColor=white)](.github/workflows/ci.yml)

> A browser-based GeoJSON editor built on Apple's [MapKit JS](https://developer.apple.com/documentation/mapkitjs/). Inspired by [geojson.io](https://geojson.io/) — draw, edit, validate, and export features without leaving the page.

No server, no account, no telemetry. The on-disk JSON is the single source of truth; the map and the editor are both pure projections of the same `FeatureCollection`.

## Live demo

[geojson-lab.vercel.app](https://geojson-lab.vercel.app/) _(once deployed — placeholder for now)_

## What it does

- **Draw** points, polylines, polygons, and rectangles on Apple Maps
- **Edit** any feature's properties in a live key/value table
- **Live JSON** editor (CodeMirror 6) that round-trips with the map
- **Import** GeoJSON by drag-drop, file picker, or paste into the editor
- **Export** as `.geojson` download or clipboard copy
- **Validate** continuously against the GeoJSON spec via `@placemarkio/check-geojson`

## Quick start

```bash
npm install
npm run dev
```

Then open <http://localhost:5173>.

**Note on the MapKit JS token.** This is a SPA, so the JWT cannot be safely signed in the browser — the Apple `.p8` private key must stay server-side. The repo ships with a tiny Vercel Edge Function at [`api/mapkit-token.ts`](api/mapkit-token.ts) that signs short-lived JWTs on demand; the client fetches them via `mapkit.init`'s `authorizationCallback`. Without the env vars below, `useMapKit` lands in the `unauthorized` state and the rest of the app still works (drawing, editing, import/export — the map tiles just don't render).

To wire a real token:

1. In your [Apple Developer Account](https://developer.apple.com/account/) → Certificates, Identifiers & Profiles → Identifiers → register a **Maps ID**.
2. Under **Keys**, create a **MapKit JS Key**, download the `.p8` file. Note your **Team ID** and the **Key ID** of the new key.
3. Copy [`.env.example`](.env.example) → `.env.local` and fill in:
   - `MAPKIT_TEAM_ID`
   - `MAPKIT_KEY_ID`
   - `MAPKIT_PRIVATE_KEY` (paste the full PEM contents of the `.p8` file)
   - Optional: `MAPKIT_ORIGIN` for the `aud` claim, `ALLOWED_ORIGINS` allowlist
4. Run locally with `npx vercel dev` (not `npm run dev` — the bare Vite server doesn't serve `/api/*`). The SPA fetches `/api/mapkit-token`, the edge function signs a 30-minute JWT (cached server-side for ~25 min), and MapKit JS validates it.
5. For deploys, set the same env vars in the Vercel project — never commit the `.p8`.

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                      <App />                           │
│   ┌──────────┐  ┌──────────────────────────────────┐  │
│   │ Toolbar  │  │            Sidebar               │  │
│   │ tools +  │  │  JSON  │ CodeMirror 6, validated │  │
│   │ file     │  │  Props │ key/value editor        │  │
│   │          │  └──────────────────────────────────┘  │
│   └──────────┘                                         │
│   ┌──────────┐                                         │
│   │ MapCanvas│  ← drawing surface, draft preview,     │
│   │ MapKit JS│    drag-drop import, click-to-select   │
│   └──────────┘                                         │
└────────────────────────────────────────────────────────┘
                          │
                          ▼
          ┌──────────────────────────────┐
          │  useFeatureStore (Zustand)   │
          │   features, selectedId,      │
          │   tool, draftFeature, toasts │
          └──────────────────────────────┘
```

**Notable engineering choices:**

- **Hand-rolled MapKit JS types** ([`src/mapkit/types.ts`](src/mapkit/types.ts)) covering only the surface this app touches — beats pulling in a stale community types package.
- **Drawing surface as an overlay** — a transparent div sits above the MapKit canvas; it intercepts pointer events when a drawing tool is active and is `pointer-events: none` otherwise. Avoids fighting MapKit's pan/zoom gestures.
- **Draft features** — while the user is mid-draw (clicking the 3rd vertex of a polygon), the in-progress shape lives in a separate `draftFeature` slot, not in the committed FeatureCollection. The exported JSON stays clean, and Esc cancels without leaving garbage behind.
- **Reference-equal diffing** — the map only re-renders the features whose object identity has changed since the last render. Editing JSON doesn't flash the whole map.

## Tech stack

| Layer      | Choice                       | Why                                            |
| ---------- | ---------------------------- | ---------------------------------------------- |
| Build      | Vite + React 19 + TypeScript | Standard, fast HMR                             |
| State      | Zustand                      | Minimal API, no provider tree                  |
| Editor     | CodeMirror 6                 | ~150KB, modern, theme-able                     |
| Validation | `@placemarkio/check-geojson` | Strict GeoJSON spec checker with useful errors |
| Styling    | CSS Modules + design tokens  | Zero runtime, system-native palette            |
| Map        | MapKit JS 5.x                | Apple's official web maps SDK                  |

## Keyboard shortcuts

| Key                    | Action                            |
| ---------------------- | --------------------------------- |
| `H`                    | Hand (pan / select)               |
| `P`                    | Point tool                        |
| `L`                    | Line tool                         |
| `G`                    | Polygon tool                      |
| `R`                    | Rectangle tool                    |
| `Delete` / `Backspace` | Delete selected feature           |
| `Esc`                  | Cancel current draw               |
| `Enter`                | Commit current polyline / polygon |

## Roadmap

- Vertex-level edit handles (drag individual polyline/polygon vertices)
- KML / TopoJSON / CSV import
- Per-feature simplestyle-spec editor (color, stroke, fill)
- "Open in Apple Maps" deep link per feature
- [Look Around](https://developer.apple.com/documentation/mapkitjs/mapkit/lookaround) button on point selection
- Reverse-geocode the dropped point and auto-fill a name

> This is an educational reference project; the repo is read-only. Issues and PRs are disabled — feel free to **fork** and adapt.

## Project layout

```
src/
├── App.tsx                  — layout shell
├── mapkit/                  — MapKit JS glue: loader, types, GeoJSON ↔ overlays
├── store/                   — Zustand store (single source of truth)
├── hooks/                   — useMapKit, useDrawingTool, useDropImport,
│                              useKeyboardShortcuts
├── components/              — Toolbar, MapCanvas, Sidebar, JsonEditor,
│                              PropertiesTable, ToastHost, icons
└── lib/                     — pure helpers (download, validate, sample)
```

## License

[MIT](LICENSE).
