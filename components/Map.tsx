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
  // Store airport coords for range ring origin lookup (ICAO → [lon, lat])
  const airportCoords = useRef<Record<string, [number, number]>>({});

  // ── Initialize map ─────────────────────────────────────────────────────
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
      map.current!.on("mouseenter", "airport-circles", () => {
        map.current!.getCanvas().style.cursor = "pointer";
      });
      map.current!.on("mouseleave", "airport-circles", () => {
        map.current!.getCanvas().style.cursor = "";
      });

      map.current!.on("click", "airport-circles", (e) => {
        if (!e.features || e.features.length === 0) return;
        const props = e.features[0].properties as { id: string };
        const coords = (e.features[0].geometry as GeoJSON.Point).coordinates as [number, number];
        onAirportClick(props.id);
        map.current!.flyTo({ center: coords, zoom: 8, duration: 1500 });
      });

      map.current!.on("click", (e) => {
        const features = map.current!.queryRenderedFeatures(e.point, {
          layers: ["airport-circles"],
        });
        if (features.length === 0) onMapDeselect();
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync: selected airport highlight ──────────────────────────────────
  useEffect(() => {
    if (!map.current?.isStyleLoaded()) return;
    map.current.setFilter("airport-selected", [
      "==", ["get", "id"], selectedAirportId ?? "",
    ]);
  }, [selectedAirportId]);

  // ── Sync: range ring ───────────────────────────────────────────────────
  useEffect(() => {
    if (!map.current?.isStyleLoaded()) return;
    const source = map.current.getSource("range-ring") as GeoJSONSource | undefined;
    source?.setData(rangeCircleGeoJSON ?? EMPTY_FC);
  }, [rangeCircleGeoJSON]);

  // ── Sync: candidate airports ───────────────────────────────────────────
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
  }, [candidateAirports]);

  return (
    <div className="w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}
