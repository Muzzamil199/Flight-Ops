"use client";

import { useState, useRef, useCallback } from "react";
import Map from "../components/Map";
import AircraftInputSidebar from "../components/AircraftInputSidebar";
import AirportDetailPanel from "../components/AirportDetailPanel";
import CandidateStopCards from "../components/CandidateStopCards";
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
  const [selectedCandidates, setSelectedCandidates] = useState<StopCandidate[]>([]);
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

  // ── Airport click: open detail panel + toggle candidate card ──────────
  function handleAirportClick(id: string) {
    setSelectedAirportId(id);

    // If Find Stops has run and this airport is a candidate, toggle it in/out of the shortlist
    if (candidateAirports.length > 0) {
      const candidate = candidateAirports.find((c) => c.airportId === id);
      if (candidate) {
        setSelectedCandidates((prev) => {
          const already = prev.some((c) => c.airportId === id);
          return already ? prev.filter((c) => c.airportId !== id) : [...prev, candidate];
        });
      }
    }
  }

  // ── Candidate toggle from detail panel button ─────────────────────────
  function handleToggleCandidate(candidate: StopCandidate) {
    // Prefer the richer Find Stops data if this airport was evaluated
    const richVersion = candidateAirports.find((c) => c.airportId === candidate.airportId);
    const toAdd = richVersion ?? candidate;
    setSelectedCandidates((prev) =>
      prev.some((c) => c.airportId === toAdd.airportId)
        ? prev.filter((c) => c.airportId !== toAdd.airportId)
        : [...prev, toAdd]
    );
  }

  // ── Stop evaluation ───────────────────────────────────────────────────
  async function handleFindStops() {
    if (!departureIcao || computedRangeNm === 0) return;
    setIsEvaluating(true);
    setCandidateAirports([]);
    setSelectedCandidates([]);

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
          onAirportClick={handleAirportClick}
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
            isAddedAsCandidate={selectedCandidates.some((c) => c.airportId === selectedAirportId)}
            onToggleCandidate={handleToggleCandidate}
            onClose={() => setSelectedAirportId(null)}
          />
        )}

        {/* Candidate stop cards strip */}
        <CandidateStopCards
          candidates={selectedCandidates}
          onCardClick={(id) => setSelectedAirportId(id)}
          onRemove={(id) =>
            setSelectedCandidates((prev) => prev.filter((c) => c.airportId !== id))
          }
        />

        {/* Fuel rate legend */}
        <div className="absolute bottom-8 left-4 z-10 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2.5 pointer-events-none">
          <div className="text-[9px] uppercase tracking-wider text-gray-500 mb-1.5">Fuel Rate ($/gal)</div>
          <div className="space-y-1.5">
            {[
              { color: "#22c55e", label: "< $6.50" },
              { color: "#84cc16", label: "$6.50–$7.50" },
              { color: "#eab308", label: "$7.50–$8.50" },
              { color: "#f97316", label: "$8.50–$10.00" },
              { color: "#dc2626", label: "> $10.00" },
              { color: "#6b7280", label: "No data" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
