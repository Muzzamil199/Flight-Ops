"use client";

import { useState, useRef, useCallback } from "react";
import Map from "../components/Map";
import AircraftInputSidebar from "../components/AircraftInputSidebar";
import AirportDetailPanel from "../components/AirportDetailPanel";
import { rangeNm } from "../lib/fuelCalculator";
import { buildRangeCircle } from "../lib/rangeCalculator";
import type {
  AircraftInputs,
  FlightContext,
  ActiveWarningFilters,
  StopCandidate,
  StopEvaluationRequest,
} from "../lib/types";
import type { Feature, Polygon } from "geojson";

const DEFAULT_AIRCRAFT: AircraftInputs = {
  fuelLbs: 0,
  burnRateLbsPerHr: 0,
  cruiseSpeedKts: 0,
  windKts: 0,
  fuelDensityLbsPerGal: 6.7,
};

const DEFAULT_CONTEXT: FlightContext = {
  flightType: "NON_REVENUE",
  flightCategory: "DOMESTIC",
  fuelCard: "NONE",
  departureTimeUtc: new Date().toISOString(),
};

export default function Home() {
  // ── Shared state ─────────────────────────────────────────────────────
  const [departureIcao, setDepartureIcao] = useState("");
  const [aircraftPreset, setAircraftPreset] = useState("custom");
  const [aircraftInputs, setAircraftInputs] = useState<AircraftInputs>(DEFAULT_AIRCRAFT);
  const [flightContext, setFlightContext] = useState<FlightContext>(DEFAULT_CONTEXT);
  const [filters, setFilters] = useState<ActiveWarningFilters>({ categories: [], types: [] });
  const [selectedAirportId, setSelectedAirportId] = useState<string | null>(null);
  const [candidateAirports, setCandidateAirports] = useState<StopCandidate[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Coords lookup provided by Map after it loads airport data
  const getAirportCoords = useRef<((icao: string) => [number, number] | null) | null>(null);

  // ── Derived values ────────────────────────────────────────────────────
  const computedRangeNm = rangeNm(
    aircraftInputs.fuelLbs,
    aircraftInputs.burnRateLbsPerHr,
    aircraftInputs.cruiseSpeedKts,
    aircraftInputs.windKts
  );

  let rangeCircleGeoJSON: Feature<Polygon> | null = null;
  if (computedRangeNm > 0 && departureIcao.length >= 3 && getAirportCoords.current) {
    const coords = getAirportCoords.current(departureIcao);
    if (coords) {
      rangeCircleGeoJSON = buildRangeCircle(coords[0], coords[1], computedRangeNm);
    }
  }

  // ── Map ready callback ─────────────────────────────────────────────
  const handleMapReady = useCallback(
    (fn: (icao: string) => [number, number] | null) => {
      getAirportCoords.current = fn;
    },
    []
  );

  // ── Stop evaluation ───────────────────────────────────────────────────
  async function handleFindStops() {
    if (!departureIcao || computedRangeNm === 0) return;
    setIsEvaluating(true);
    setCandidateAirports([]);

    try {
      const body: StopEvaluationRequest = {
        originIcao: departureIcao,
        aircraft: aircraftInputs,
        flightType: flightContext.flightType,
        flightCategory: flightContext.flightCategory,
        fuelCard: flightContext.fuelCard,
        departureTimeUtc: flightContext.departureTimeUtc,
      };

      const res = await fetch("/api/stop-evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setCandidateAirports(data.candidates ?? []);
      }
    } catch (err) {
      console.error("Stop evaluation failed:", err);
    } finally {
      setIsEvaluating(false);
    }
  }

  return (
    <main className="flex h-screen w-full overflow-hidden bg-black">
      {/* Left sidebar */}
      <AircraftInputSidebar
        departureIcao={departureIcao}
        onDepartureIcaoChange={setDepartureIcao}
        aircraftPreset={aircraftPreset}
        onPresetChange={setAircraftPreset}
        inputs={aircraftInputs}
        onInputsChange={setAircraftInputs}
        flightContext={flightContext}
        onFlightContextChange={setFlightContext}
        rangeNm={computedRangeNm}
        filters={filters}
        onFiltersChange={setFilters}
        onFindStops={handleFindStops}
        isEvaluating={isEvaluating}
      />

      {/* Map area */}
      <div className="flex-1 relative">
        <Map
          selectedAirportId={selectedAirportId}
          onAirportClick={setSelectedAirportId}
          onMapDeselect={() => setSelectedAirportId(null)}
          rangeCircleGeoJSON={rangeCircleGeoJSON}
          candidateAirports={candidateAirports}
          onMapReady={handleMapReady}
        />

        {/* Airport detail panel */}
        {selectedAirportId && (
          <AirportDetailPanel
            airportId={selectedAirportId}
            flightContext={flightContext}
            filters={filters}
            fuelCard={flightContext.fuelCard}
            fuelLbs={aircraftInputs.fuelLbs}
            fuelDensityLbsPerGal={aircraftInputs.fuelDensityLbsPerGal}
            onClose={() => setSelectedAirportId(null)}
          />
        )}
      </div>
    </main>
  );
}
