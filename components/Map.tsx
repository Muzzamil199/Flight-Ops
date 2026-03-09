"use client";

import { useEffect, useRef } from "react";
import mapboxgl, { GeoJSONSource } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  AIRPORT_CIRCLES_LAYER,
  AIRPORT_LABELS_LAYER,
  AIRPORT_SELECTED_LAYER,
  AIRPORT_WARNING_ICONS_LAYER,
  RANGE_RING_FILL_LAYER,
  RANGE_RING_OUTLINE_LAYER,
  CANDIDATE_CIRCLES_LAYER,
} from "@/lib/mapLayers";
import type { StopCandidate } from "@/lib/types";
import type { Feature, Polygon, FeatureCollection } from "geojson";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

interface Props {
  selectedAirportId: string | null;
  onAirportClick: (id: string) => void;
  onMapDeselect: () => void;
  rangeCircleGeoJSON: Feature<Polygon> | null;
  candidateAirports: StopCandidate[];
  onMapReady: (getAirportCoords: (icao: string) => [number, number] | null) => void;
}

export default function Map({
  selectedAirportId,
  onAirportClick,
  onMapDeselect,
  rangeCircleGeoJSON,
  candidateAirports,
  onMapReady,
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  // Store airport coords for range ring origin lookup (ICAO → [lon, lat])
  const airportCoords = useRef<Record<string, [number, number]>>({});

  // ── Initialize map ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [0, 30],
      zoom: 2,
      projection: "globe",
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Shared hover popup (no tip, no close button)
    popup.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: "airport-hover-popup",
      maxWidth: "240px",
    });

    map.current.on("load", async () => {
      const res = await fetch("/api/airports");
      const geojson = await res.json();

      // Build ICAO → coords lookup
      for (const f of geojson.features) {
        if (f.properties?.icao) {
          airportCoords.current[f.properties.icao] = f.geometry.coordinates as [number, number];
        }
      }

      // Expose the lookup function to the parent
      onMapReady((icao: string) => airportCoords.current[icao] ?? null);

      // ── Sources ──────────────────────────────────────────────────────
      map.current!.addSource("airports", { type: "geojson", data: geojson });
      map.current!.addSource("range-ring", { type: "geojson", data: EMPTY_FC });
      map.current!.addSource("candidates", { type: "geojson", data: EMPTY_FC });

      // ── Layers (insertion order = bottom to top) ──────────────────────
      map.current!.addLayer({ id: "airport-circles",       ...AIRPORT_CIRCLES_LAYER       } as mapboxgl.CircleLayerSpecification);
      map.current!.addLayer({ id: "range-ring-fill",       ...RANGE_RING_FILL_LAYER        } as mapboxgl.FillLayerSpecification);
      map.current!.addLayer({ id: "range-ring-outline",    ...RANGE_RING_OUTLINE_LAYER     } as mapboxgl.LineLayerSpecification);
      map.current!.addLayer({ id: "airport-candidates",    ...CANDIDATE_CIRCLES_LAYER      } as mapboxgl.CircleLayerSpecification);
      map.current!.addLayer({ id: "airport-selected",      ...AIRPORT_SELECTED_LAYER       } as mapboxgl.CircleLayerSpecification);
      map.current!.addLayer({ id: "airport-warning-icons", ...AIRPORT_WARNING_ICONS_LAYER  } as mapboxgl.SymbolLayerSpecification);
      map.current!.addLayer({ id: "airport-labels",        ...AIRPORT_LABELS_LAYER         } as mapboxgl.SymbolLayerSpecification);

      // ── Interactions ─────────────────────────────────────────────────
      map.current!.on("mouseenter", "airport-circles", (e) => {
        map.current!.getCanvas().style.cursor = "pointer";
        if (!e.features || e.features.length === 0) return;

        const props = e.features[0].properties as {
          icao: string;
          name: string;
          elevation: number | null;
          runwayLength: number | null;
          warningCounts: string | { INFO: number; WARNING: number; ERROR: number };
          cheapestFuelPerGal: number | null;
        };

        const coords = (e.features[0].geometry as GeoJSON.Point).coordinates as [number, number];

        // warningCounts is serialized as a JSON string by Mapbox GL
        const wc: { INFO: number; WARNING: number; ERROR: number } =
          typeof props.warningCounts === "string"
            ? JSON.parse(props.warningCounts)
            : props.warningCounts ?? { INFO: 0, WARNING: 0, ERROR: 0 };

        const errBadge = wc.ERROR > 0
          ? `<span style="color:#ef4444;font-weight:600;">${wc.ERROR} ERR</span>` : "";
        const warnBadge = wc.WARNING > 0
          ? `<span style="color:#f59e0b;font-weight:600;">${wc.WARNING} WARN</span>` : "";
        const infoBadge = wc.INFO > 0
          ? `<span style="color:#60a5fa;">${wc.INFO} INFO</span>` : "";
        const warningLine = [errBadge, warnBadge, infoBadge].filter(Boolean).join(" &middot; ");

        const fuelLine = props.cheapestFuelPerGal != null
          ? `<div style="color:#34d399;margin-top:3px;">&#9981; $${Number(props.cheapestFuelPerGal).toFixed(2)}/gal</div>`
          : `<div style="color:#6b7280;margin-top:3px;">No fuel data</div>`;

        const html = `
          <div style="font-family:system-ui,sans-serif;padding:8px 10px;line-height:1.4;">
            <div style="font-weight:700;font-size:13px;color:#00d4aa;">${props.icao}
              <span style="font-weight:400;font-size:11px;color:#9ca3af;margin-left:4px;">${props.name ?? ""}</span>
            </div>
            <div style="font-size:11px;color:#d1d5db;margin-top:2px;">
              Elev ${props.elevation != null ? props.elevation + "ft" : "—"} &middot;
              Rwy ${props.runwayLength != null ? Number(props.runwayLength).toLocaleString() + "ft" : "—"}
            </div>
            ${warningLine ? `<div style="font-size:11px;margin-top:3px;">${warningLine}</div>` : ""}
            ${fuelLine}
          </div>`;

        popup.current!.setLngLat(coords).setHTML(html).addTo(map.current!);
      });

      map.current!.on("mouseleave", "airport-circles", () => {
        map.current!.getCanvas().style.cursor = "";
        popup.current!.remove();
      });

      map.current!.on("click", "airport-circles", (e) => {
        if (!e.features || e.features.length === 0) return;
        const props = e.features[0].properties as { id: string };
        onAirportClick(props.id);
      });

      map.current!.on("click", (e) => {
        const features = map.current!.queryRenderedFeatures(e.point, {
          layers: ["airport-circles"],
        });
        if (features.length === 0) onMapDeselect();
      });
    });

    return () => {
      popup.current?.remove();
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync: selected airport highlight ──────────────────────────────────────
  useEffect(() => {
    if (!map.current?.isStyleLoaded()) return;
    map.current.setFilter("airport-selected", [
      "==", ["get", "id"], selectedAirportId ?? "",
    ]);
  }, [selectedAirportId]);

  // ── Sync: range ring ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!map.current?.isStyleLoaded()) return;
    const source = map.current.getSource("range-ring") as GeoJSONSource | undefined;
    source?.setData(rangeCircleGeoJSON ?? EMPTY_FC);
  }, [rangeCircleGeoJSON]);

  // ── Sync: candidate airports + dimming ────────────────────────────────────
  useEffect(() => {
    if (!map.current?.isStyleLoaded()) return;
    const source = map.current.getSource("candidates") as GeoJSONSource | undefined;
    if (!source) return;

    const candidateFC: FeatureCollection = {
      type: "FeatureCollection",
      features: candidateAirports.map((c) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [c.lon, c.lat] },
        properties: {
          id: c.airportId,
          icao: c.icao,
          feasibilityStatus: c.feasibilityStatus,
          distanceNm: c.distanceNm,
        },
      })),
    };
    source.setData(candidateFC);

    // Dim non-candidate airports when Find Stops has run
    if (candidateAirports.length > 0) {
      const candidateIds = candidateAirports.map((c) => c.airportId);
      map.current.setPaintProperty("airport-circles", "circle-opacity", [
        "case",
        ["in", ["get", "id"], ["literal", candidateIds]],
        0.95,
        0.15,
      ]);
      map.current.setPaintProperty("airport-circles", "circle-stroke-opacity", [
        "case",
        ["in", ["get", "id"], ["literal", candidateIds]],
        0.8,
        0.08,
      ]);
    } else {
      // Reset to defaults when candidates are cleared
      map.current.setPaintProperty("airport-circles", "circle-opacity", 0.85);
      map.current.setPaintProperty("airport-circles", "circle-stroke-opacity", 0.6);
    }
  }, [candidateAirports]);

  return (
    <div className="w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      <style>{`
        .airport-hover-popup .mapboxgl-popup-content {
          background: #111827;
          border: 1px solid #374151;
          border-radius: 8px;
          padding: 0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.6);
        }
        .airport-hover-popup .mapboxgl-popup-tip { display: none; }
      `}</style>
    </div>
  );
}
