"use client";

import { evaluateWarning } from "@/lib/warningEvaluator";
import type { WarningRecord, FlightContext, ActiveWarningFilters } from "@/lib/types";
import WarningBadge from "./WarningBadge";

interface Props {
  warnings: WarningRecord[];
  flightContext: FlightContext;
  airportTimezone: string;
  filters: ActiveWarningFilters;
}

export default function WarningList({ warnings, flightContext, airportTimezone, filters }: Props) {
  if (warnings.length === 0) {
    return (
      <p className="text-xs text-gray-500 py-2">No active warnings for this airport.</p>
    );
  }

  // Evaluate each warning against the current flight context
  const evaluated = warnings.map((w) => ({
    warning: w,
    isTriggered: evaluateWarning(w.triggerConditions, {
      flightCategory: flightContext.flightCategory,
      flightType: flightContext.flightType,
      departureTimeUtc: flightContext.departureTimeUtc,
      airportTimezone,
    }),
  }));

  // Apply filters
  const filtered = evaluated.filter(({ warning }) => {
    if (filters.types.length > 0 && !filters.types.includes(warning.type)) return false;
    if (filters.categories.length > 0 && !filters.categories.includes(warning.category)) return false;
    return true;
  });

  if (filtered.length === 0) {
    return (
      <p className="text-xs text-gray-500 py-2">No warnings match current filters.</p>
    );
  }

  // Sort: triggered first, then by severity (ERROR > WARNING > INFO)
  const severityOrder = { ERROR: 0, WARNING: 1, INFO: 2 };
  filtered.sort((a, b) => {
    if (a.isTriggered !== b.isTriggered) return a.isTriggered ? -1 : 1;
    return (severityOrder[a.warning.type] ?? 3) - (severityOrder[b.warning.type] ?? 3);
  });

  return (
    <div className="space-y-2">
      {filtered.map(({ warning, isTriggered }) => (
        <WarningBadge key={warning.id} warning={warning} isTriggered={isTriggered} />
      ))}
    </div>
  );
}
