"use client";

import type { StopCandidate } from "@/lib/types";

interface Props {
  candidates: StopCandidate[];
  onCardClick: (airportId: string) => void;
  onRemove: (airportId: string) => void;
}

const FEASIBILITY_COLORS = {
  GO:      { dot: "bg-emerald-400", border: "border-emerald-500/40" },
  CAUTION: { dot: "bg-amber-400",   border: "border-amber-500/40"   },
  NO_GO:   { dot: "bg-red-500",     border: "border-red-500/40"     },
};

export default function CandidateStopCards({ candidates, onCardClick, onRemove }: Props) {
  if (candidates.length === 0) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-4 pointer-events-none">
      <div className="flex gap-2 overflow-x-auto pb-1 pointer-events-auto"
           style={{ scrollbarWidth: "thin", scrollbarColor: "#374151 transparent" }}>
        {candidates.map((c) => {
          const colors = FEASIBILITY_COLORS[c.feasibilityStatus] ?? FEASIBILITY_COLORS.CAUTION;
          return (
            <div
              key={c.airportId}
              className={`flex-shrink-0 flex items-center gap-2.5 bg-gray-900/95 backdrop-blur-sm border ${colors.border} rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-800/95 transition-colors group`}
              style={{ minWidth: 180 }}
              onClick={() => onCardClick(c.airportId)}
            >
              {/* Feasibility dot */}
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />

              {/* Airport info */}
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white leading-tight">{c.icao}</span>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {c.errorCount > 0 && (
                    <span className="text-[10px] font-semibold text-red-400">
                      {c.errorCount} ERR
                    </span>
                  )}
                  {c.warningCount > 0 && (
                    <span className="text-[10px] font-semibold text-amber-400">
                      {c.warningCount} WARN
                    </span>
                  )}
                  {c.cheapestFuelPerGal != null && (
                    <span className="text-[10px] text-teal-400">
                      ${c.cheapestFuelPerGal.toFixed(2)}/gal
                    </span>
                  )}
                  <span className="text-[10px] text-gray-500">
                    {c.distanceNm > 0 ? `${Math.round(c.distanceNm)} nm` : "—"}
                  </span>
                </div>
              </div>

              {/* Remove button */}
              <button
                className="ml-auto text-gray-600 hover:text-white flex-shrink-0 text-xs leading-none p-0.5 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(c.airportId);
                }}
                aria-label={`Remove ${c.icao}`}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
