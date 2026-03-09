import type {
  CircleLayerSpecification,
  SymbolLayerSpecification,
  FillLayerSpecification,
  LineLayerSpecification,
} from "mapbox-gl";

// ── Airport base circles ───────────────────────────────────────────────────

export const AIRPORT_CIRCLES_LAYER: Omit<CircleLayerSpecification, "id"> = {
  type: "circle",
  source: "airports",
  paint: {
    "circle-radius": [
      "interpolate", ["linear"], ["zoom"],
      2, 4,
      6, 7,
      10, 12,
    ],
    "circle-color": [
      "case",
      // Inactive airports: dark gray regardless of fuel data
      ["!=", ["get", "status"], "active"], "#374151",
      // Active airports: color by cheapest fuel price tier
      ["<", ["coalesce", ["get", "cheapestFuelPerGal"], -1], 0], "#6b7280",  // no data → gray
      ["<", ["get", "cheapestFuelPerGal"], 6.5],  "#22c55e",  // < $6.50 → green
      ["<", ["get", "cheapestFuelPerGal"], 7.5],  "#84cc16",  // $6.50–$7.50 → lime
      ["<", ["get", "cheapestFuelPerGal"], 8.5],  "#eab308",  // $7.50–$8.50 → yellow
      ["<", ["get", "cheapestFuelPerGal"], 10.0], "#f97316",  // $8.50–$10 → orange
      "#dc2626",                                               // > $10 → red
    ],
    "circle-stroke-width": 1.5,
    "circle-stroke-color": "#ffffff",
    "circle-opacity": 0.85,
  },
};

// ── ICAO labels ────────────────────────────────────────────────────────────

export const AIRPORT_LABELS_LAYER: Omit<SymbolLayerSpecification, "id"> = {
  type: "symbol",
  source: "airports",
  minzoom: 3,
  layout: {
    "text-field": ["get", "icao"],
    "text-size": 11,
    "text-offset": [0, -1.5],
    "text-anchor": "bottom",
    "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
  },
  paint: {
    "text-color": "#ffffff",
    "text-halo-color": "#000000",
    "text-halo-width": 1,
  },
};

// ── Selected airport highlight ring ───────────────────────────────────────

export const AIRPORT_SELECTED_LAYER: Omit<CircleLayerSpecification, "id"> = {
  type: "circle",
  source: "airports",
  filter: ["==", ["get", "id"], ""], // updated dynamically via setFilter
  paint: {
    "circle-radius": [
      "interpolate", ["linear"], ["zoom"],
      2, 7,
      6, 11,
      10, 16,
    ],
    "circle-color": "#ffffff",
    "circle-opacity": 0,
    "circle-stroke-width": 2.5,
    "circle-stroke-color": "#00d4aa",
    "circle-stroke-opacity": 1,
  },
};

// ── Warning icon (! symbol) for airports with ERROR-level warnings ─────────

export const AIRPORT_WARNING_ICONS_LAYER: Omit<SymbolLayerSpecification, "id"> = {
  type: "symbol",
  source: "airports",
  filter: ["==", ["get", "hasError"], true],
  layout: {
    "text-field": "!",
    "text-size": 10,
    "text-offset": [0.9, -0.9],
    "text-anchor": "center",
    "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
  },
  paint: {
    "text-color": "#ff4444",
    "text-halo-color": "#000000",
    "text-halo-width": 1.5,
  },
};

// ── Range ring fill ────────────────────────────────────────────────────────

export const RANGE_RING_FILL_LAYER: Omit<FillLayerSpecification, "id"> = {
  type: "fill",
  source: "range-ring",
  paint: {
    "fill-color": "#00d4aa",
    "fill-opacity": 0.07,
  },
};

// ── Range ring outline ─────────────────────────────────────────────────────

export const RANGE_RING_OUTLINE_LAYER: Omit<LineLayerSpecification, "id"> = {
  type: "line",
  source: "range-ring",
  paint: {
    "line-color": "#00d4aa",
    "line-width": 1.5,
    "line-dasharray": [3, 3],
    "line-opacity": 0.6,
  },
};

// ── Stop evaluation candidate circles ─────────────────────────────────────
// Uses a separate "candidates" source (not the airports source) so that
// feasibilityStatus can be stored as a GeoJSON feature property.

export const CANDIDATE_CIRCLES_LAYER: Omit<CircleLayerSpecification, "id"> = {
  type: "circle",
  source: "candidates",
  paint: {
    "circle-radius": [
      "interpolate", ["linear"], ["zoom"],
      2, 6,
      6, 10,
      10, 15,
    ],
    "circle-color": [
      "match", ["get", "feasibilityStatus"],
      "GO",     "#22c55e",
      "CAUTION","#f59e0b",
      "NO_GO",  "#ef4444",
      "#6b7280",
    ],
    "circle-stroke-width": 2,
    "circle-stroke-color": "#ffffff",
    "circle-opacity": 0.9,
  },
};
