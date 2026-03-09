"use client";

import { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import WarningList from "./WarningList";
import FuelBreakdown from "./FuelBreakdown";
import type {
  AirportDetailResponse,
  WarningsResponse,
  FuelBreakdownResponse,
  FlightContext,
  ActiveWarningFilters,
  FuelCardProvider,
  StopCandidate,
} from "@/lib/types";
import { FUEL_CARD_DISCOUNTS } from "@/lib/fuelCalculator";

interface Props {
  airportId: string; // ICAO or DB id
  flightContext: FlightContext;
  filters: ActiveWarningFilters;
  fuelCard: FuelCardProvider;
  fuelLbs: number;
  fuelDensityLbsPerGal: number;
  isAddedAsCandidate: boolean;
  onToggleCandidate: (candidate: StopCandidate) => void;
  onClose: () => void;
}

// ── Reusable display helpers ───────────────────────────────────────────────

function InfoCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-gray-800/60 rounded px-2.5 py-1.5">
      <div className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-medium mt-0.5 ${highlight ? "text-emerald-400" : "text-white"}`}>
        {value}
      </div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-1">
      <Separator className="bg-gray-800 mb-2" />
      <h3 className="text-[10px] text-gray-400 uppercase tracking-wider">{children}</h3>
    </div>
  );
}

function StatusDot({ active, label, warn }: { active: boolean; label: string; warn?: boolean }) {
  if (!active) return null;
  return (
    <div className="flex items-center gap-2">
      <span className={`w-1.5 h-1.5 rounded-full ${warn ? "bg-amber-400" : "bg-emerald-400"}`} />
      <span className="text-xs text-gray-300">{label}</span>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────

export default function AirportDetailPanel({
  airportId,
  flightContext,
  filters,
  fuelCard,
  fuelLbs,
  fuelDensityLbsPerGal,
  isAddedAsCandidate,
  onToggleCandidate,
  onClose,
}: Props) {
  const [airport, setAirport] = useState<AirportDetailResponse | null>(null);
  const [warnings, setWarnings] = useState<WarningsResponse | null>(null);
  const [fuel, setFuel] = useState<FuelBreakdownResponse | null>(null);
  const [loadingAirport, setLoadingAirport] = useState(true);
  const [loadingWarnings, setLoadingWarnings] = useState(true);
  const [loadingFuel, setLoadingFuel] = useState(true);

  // Fetch airport detail
  useEffect(() => {
    setLoadingAirport(true);
    fetch(`/api/airports/${airportId}`)
      .then((r) => r.json())
      .then((data) => setAirport(data))
      .catch(() => setAirport(null))
      .finally(() => setLoadingAirport(false));
  }, [airportId]);

  // Fetch warnings
  useEffect(() => {
    setLoadingWarnings(true);
    fetch(`/api/airports/${airportId}/warnings`)
      .then((r) => r.json())
      .then((data) => setWarnings(data))
      .catch(() => setWarnings(null))
      .finally(() => setLoadingWarnings(false));
  }, [airportId]);

  // Fetch fuel (re-fetches when fuelCard changes)
  useEffect(() => {
    setLoadingFuel(true);
    fetch(`/api/airports/${airportId}/fuel?fuelCard=${fuelCard}`)
      .then((r) => r.json())
      .then((data) => setFuel(data))
      .catch(() => setFuel(null))
      .finally(() => setLoadingFuel(false));
  }, [airportId, fuelCard]);

  const ops = airport?.operations;

  // Derive total cost estimate from cheapest fuel entry
  const cheapestEntry = fuel?.prices.find((p) => p.isCheapest);
  const gallons = fuelDensityLbsPerGal > 0 ? fuelLbs / fuelDensityLbsPerGal : 0;
  const totalCostEst =
    cheapestEntry && gallons > 0 ? gallons * cheapestEntry.effectivePricePerGal : null;
  const discountPct = FUEL_CARD_DISCOUNTS[fuelCard] ?? 0;

  // Build a StopCandidate from loaded panel data for the toggle button
  function buildCandidate(): StopCandidate | null {
    if (!airport) return null;
    return {
      airportId: airport.id,
      icao: airport.icao,
      name: airport.name,
      lat: airport.lat,
      lon: airport.lon,
      distanceNm: 0,
      feasibilityStatus: "CAUTION",
      hardBlockers: [],
      warningCount: warnings?.warnings.filter((w) => w.type === "WARNING").length ?? 0,
      errorCount: warnings?.warnings.filter((w) => w.type === "ERROR").length ?? 0,
      cheapestFuelPerGal: fuel?.prices.find((p) => p.isCheapest)?.pricePerGal ?? null,
      estimatedFuelCostUsd: null,
      rankScore: 0,
    };
  }

  return (
    <div className="absolute top-4 right-16 z-10 w-80 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-2xl text-white overflow-hidden flex flex-col max-h-[90vh]">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-gray-700 flex justify-between items-start flex-shrink-0">
        <div className="flex-1 min-w-0">
          {loadingAirport ? (
            <div className="animate-pulse h-6 w-24 bg-gray-700 rounded mb-1" />
          ) : (
            <>
              <h2 className="text-lg font-bold tracking-tight">
                {airport?.icao}
                {airport?.iata && (
                  <span className="text-gray-400 font-normal ml-2 text-sm">/ {airport.iata}</span>
                )}
              </h2>
              <p className="text-sm text-gray-300 mt-0.5">{airport?.name}</p>
              {airport?.city && (
                <p className="text-xs text-gray-500">
                  {airport.city}, {airport.countryCode}
                </p>
              )}
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0 mt-0.5">
          {!loadingAirport && airport && (
            <button
              onClick={() => {
                const c = buildCandidate();
                if (c) onToggleCandidate(c);
              }}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                isAddedAsCandidate
                  ? "border-teal-600 text-teal-400 bg-teal-900/20"
                  : "border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white"
              }`}
            >
              {isAddedAsCandidate ? "✓ Added" : "+ Candidate"}
            </button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-white h-6 w-6 p-0"
          >
            ✕
          </Button>
        </div>
      </div>

      {/* Scrollable content — native scroll for reliable flex-1 behavior */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 text-sm"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#374151 transparent" }}
      >
        <div className="space-y-3">

          {/* 1. Quick stats: Elevation + Runway */}
          {!loadingAirport && airport && (
            <div className="grid grid-cols-2 gap-2">
              <InfoCard
                label="Elevation"
                value={airport.elevation ? `${airport.elevation.toLocaleString()} ft` : "N/A"}
              />
              <InfoCard
                label="Runway"
                value={airport.runwayLength ? `${airport.runwayLength.toLocaleString()} ft` : "N/A"}
              />
            </div>
          )}

          {/* 2. Warnings */}
          <SectionHeader>
            Warnings
            {warnings && warnings.warnings.length > 0 && ` (${warnings.warnings.length})`}
          </SectionHeader>
          {loadingWarnings ? (
            <div className="animate-pulse space-y-2">
              <div className="h-10 bg-gray-800 rounded" />
              <div className="h-10 bg-gray-800 rounded" />
            </div>
          ) : warnings ? (
            <WarningList
              warnings={warnings.warnings}
              flightContext={flightContext}
              airportTimezone={airport?.timezone ?? "UTC"}
              filters={filters}
            />
          ) : (
            <p className="text-xs text-gray-500">Could not load warnings.</p>
          )}

          {/* 3. Info (Operations flags) */}
          {ops && (
            <>
              <SectionHeader>Info</SectionHeader>
              <div className="space-y-1.5">
                <StatusDot active={ops.operatesH24}      label="24hr Operations" />
                <StatusDot active={ops.customsAvailable} label="Customs Available" />
                <StatusDot active={ops.customsH24}       label="24hr Customs" />
                <StatusDot active={ops.slotsRequired}    label="Slots Required" warn />
                <StatusDot
                  active={ops.hasCurfew}
                  label={ops.hasCurfew ? `Curfew ${ops.curfewStart || ""}–${ops.curfewEnd || ""}` : "No Curfew"}
                  warn={ops.hasCurfew}
                />
                <StatusDot
                  active={ops.noiseMonitoring}
                  label={ops.noiseLimit ? `Noise Limit: ${ops.noiseLimit} dB` : "Noise Monitoring"}
                  warn
                />
                <StatusDot
                  active={ops.permitRequired !== "NONE"}
                  label={`Permit: ${ops.permitRequired}`}
                  warn={ops.permitRequired !== "NONE"}
                />
                <StatusDot active={ops.pprMandatory}   label="PPR Mandatory" warn />
                <StatusDot active={ops.parkingLimited} label="Parking Limited" warn />
              </div>

              {ops.quirks && (
                <>
                  <SectionHeader>Notes & Quirks</SectionHeader>
                  <p className="text-xs text-amber-300/80 leading-relaxed">{ops.quirks}</p>
                </>
              )}
            </>
          )}

          {/* 4. Fuel Rate */}
          <SectionHeader>Fuel Rate</SectionHeader>
          {loadingFuel ? (
            <div className="animate-pulse space-y-1">
              <div className="h-8 bg-gray-800 rounded" />
              <div className="h-8 bg-gray-800 rounded" />
            </div>
          ) : fuel ? (
            <FuelBreakdown
              data={fuel}
              fuelLbs={fuelLbs}
              fuelDensityLbsPerGal={fuelDensityLbsPerGal}
              fuelCard={fuelCard}
            />
          ) : (
            <p className="text-xs text-gray-500">No fuel prices on file.</p>
          )}

          {/* 5. Available Handlers */}
          {ops && ops.handlerNames?.length > 0 && (
            <>
              <SectionHeader>Available Handlers ({ops.fboCount})</SectionHeader>
              <div className="flex flex-wrap gap-1.5">
                {ops.handlerNames.map((h) => (
                  <span key={h} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-300">
                    {h}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* 6. Total Cost Est */}
          {totalCostEst != null && (
            <>
              <SectionHeader>Total Cost Est.</SectionHeader>
              <div className="bg-gray-800/60 rounded px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {Math.round(gallons).toLocaleString()} gal
                  {discountPct > 0 && (
                    <span className="text-teal-400 ml-1.5">
                      {(discountPct * 100).toFixed(0)}% card discount
                    </span>
                  )}
                </span>
                <span className="text-lg font-bold text-teal-400">
                  ${Math.round(totalCostEst).toLocaleString()}
                </span>
              </div>
            </>
          )}

          {/* Bottom padding */}
          <div className="h-2" />
        </div>
      </div>
    </div>
  );
}
