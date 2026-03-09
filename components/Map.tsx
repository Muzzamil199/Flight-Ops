"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface AirportProperties {
  id: string;
  icao: string;
  iata: string | null;
  name: string;
  city: string | null;
  elevation: number | null;
  timezone: string;
  countryCode: string;
  runwayLength: number | null;
  status: string;
  operations: {
    operatesH24: boolean;
    hasCurfew: boolean;
    curfewType: string | null;
    curfewStart: string | null;
    curfewEnd: string | null;
    slotsRequired: boolean;
    noiseMonitoring: boolean;
    noiseLimit: number | null;
    customsAvailable: boolean;
    customsH24: boolean;
    handlerNames: string[];
    fboCount: number;
    quirks: string | null;
    permitRequired: string;
    permitLeadDays: number;
    pprMandatory: boolean;
  } | null;
}

interface AirportFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: AirportProperties;
}

export default function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedAirport, setSelectedAirport] = useState<AirportProperties | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [0, 30],
      zoom: 2,
      projection: "globe",
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", async () => {
      // Fetch airports from API
      const res = await fetch("/api/airports");
      const geojson = await res.json();

      // Add airport source
      map.current!.addSource("airports", {
        type: "geojson",
        data: geojson,
      });

      // Airport circle layer
      map.current!.addLayer({
        id: "airport-circles",
        type: "circle",
        source: "airports",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            2, 4,
            6, 7,
            10, 12,
          ],
          "circle-color": [
            "case",
            ["==", ["get", "status"], "active"],
            "#00d4aa",
            "#ff4444",
          ],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.85,
        },
      });

      // ICAO labels (visible at higher zoom)
      map.current!.addLayer({
        id: "airport-labels",
        type: "symbol",
        source: "airports",
        minzoom: 5,
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
      });

      // Hover cursor
      map.current!.on("mouseenter", "airport-circles", () => {
        map.current!.getCanvas().style.cursor = "pointer";
      });
      map.current!.on("mouseleave", "airport-circles", () => {
        map.current!.getCanvas().style.cursor = "";
      });

      // Click interaction
      map.current!.on("click", "airport-circles", (e) => {
        if (!e.features || e.features.length === 0) return;

        const feature = e.features[0] as unknown as AirportFeature;
        const coords = feature.geometry.coordinates;

        // Parse operations (Mapbox stringifies nested objects)
        const props = { ...feature.properties };
        if (typeof props.operations === "string") {
          try {
            props.operations = JSON.parse(props.operations);
          } catch {
            props.operations = null;
          }
        }

        setSelectedAirport(props);

        // Fly to airport
        map.current!.flyTo({
          center: coords,
          zoom: 8,
          duration: 1500,
        });
      });

      // Click on empty space to deselect
      map.current!.on("click", (e) => {
        const features = map.current!.queryRenderedFeatures(e.point, {
          layers: ["airport-circles"],
        });
        if (features.length === 0) {
          setSelectedAirport(null);
        }
      });

      setLoading(false);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <div className="relative w-full h-screen">
      {/* Map */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
          <div className="text-white text-lg font-medium tracking-wide animate-pulse">
            Loading airports...
          </div>
        </div>
      )}

      {/* Header */}
      <div className="absolute top-4 left-4 z-10">
        <h1 className="text-xl font-bold text-white tracking-tight">
          Flight Ops
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Business Aviation Intelligence
        </p>
      </div>

      {/* Airport detail panel */}
      {selectedAirport && (
        <div className="absolute top-4 right-16 z-10 w-80 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-2xl text-white overflow-hidden">
          {/* Panel header */}
          <div className="px-4 py-3 border-b border-gray-700 flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {selectedAirport.icao}
                {selectedAirport.iata && (
                  <span className="text-gray-400 font-normal ml-2 text-sm">
                    / {selectedAirport.iata}
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-300 mt-0.5">
                {selectedAirport.name}
              </p>
              {selectedAirport.city && (
                <p className="text-xs text-gray-500">
                  {selectedAirport.city}, {selectedAirport.countryCode}
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedAirport(null)}
              className="text-gray-500 hover:text-white text-lg leading-none mt-1"
            >
              ✕
            </button>
          </div>

          {/* Airport info */}
          <div className="px-4 py-3 space-y-3 max-h-[70vh] overflow-y-auto text-sm">
            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-2">
              <InfoCard
                label="Elevation"
                value={
                  selectedAirport.elevation
                    ? `${selectedAirport.elevation.toLocaleString()} ft`
                    : "N/A"
                }
              />
              <InfoCard
                label="Runway"
                value={
                  selectedAirport.runwayLength
                    ? `${selectedAirport.runwayLength.toLocaleString()} ft`
                    : "N/A"
                }
              />
              <InfoCard
                label="Timezone"
                value={selectedAirport.timezone.split("/").pop() || ""}
              />
              <InfoCard
                label="Status"
                value={selectedAirport.status}
                highlight={selectedAirport.status === "active"}
              />
            </div>

            {/* Operations */}
            {selectedAirport.operations && (
              <>
                <SectionTitle>Operations</SectionTitle>

                <div className="space-y-1.5">
                  <Badge
                    active={selectedAirport.operations.operatesH24}
                    label="24hr Operations"
                  />
                  <Badge
                    active={selectedAirport.operations.customsAvailable}
                    label="Customs Available"
                  />
                  <Badge
                    active={selectedAirport.operations.customsH24}
                    label="24hr Customs"
                  />
                  <Badge
                    active={selectedAirport.operations.slotsRequired}
                    label="Slots Required"
                    warn
                  />
                  <Badge
                    active={selectedAirport.operations.hasCurfew}
                    label={
                      selectedAirport.operations.hasCurfew
                        ? `Curfew ${selectedAirport.operations.curfewStart || ""}–${selectedAirport.operations.curfewEnd || ""}`
                        : "No Curfew"
                    }
                    warn={selectedAirport.operations.hasCurfew}
                  />
                  <Badge
                    active={selectedAirport.operations.noiseMonitoring}
                    label={
                      selectedAirport.operations.noiseLimit
                        ? `Noise Limit: ${selectedAirport.operations.noiseLimit} dB`
                        : "Noise Monitoring"
                    }
                    warn
                  />
                  <Badge
                    active={selectedAirport.operations.permitRequired !== "NONE"}
                    label={`Permit: ${selectedAirport.operations.permitRequired}`}
                    warn={selectedAirport.operations.permitRequired !== "NONE"}
                  />
                </div>

                {/* Handlers */}
                {selectedAirport.operations.handlerNames?.length > 0 && (
                  <>
                    <SectionTitle>
                      FBOs ({selectedAirport.operations.fboCount})
                    </SectionTitle>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAirport.operations.handlerNames.map((h) => (
                        <span
                          key={h}
                          className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-300"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {/* Quirks */}
                {selectedAirport.operations.quirks && (
                  <>
                    <SectionTitle>Notes & Quirks</SectionTitle>
                    <p className="text-xs text-amber-300/80 leading-relaxed">
                      {selectedAirport.operations.quirks}
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────

function InfoCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-gray-800/60 rounded px-2.5 py-1.5">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider">
        {label}
      </div>
      <div
        className={`text-sm font-medium mt-0.5 ${highlight ? "text-emerald-400" : "text-white"}`}
      >
        {value}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] text-gray-500 uppercase tracking-wider pt-1 border-t border-gray-800">
      {children}
    </div>
  );
}

function Badge({
  active,
  label,
  warn,
}: {
  active: boolean;
  label: string;
  warn?: boolean;
}) {
  if (!active) return null;
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-1.5 h-1.5 rounded-full ${warn ? "bg-amber-400" : "bg-emerald-400"}`}
      />
      <span className="text-xs text-gray-300">{label}</span>
    </div>
  );
}
