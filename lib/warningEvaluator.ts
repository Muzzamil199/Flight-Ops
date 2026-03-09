import type { TriggerConditions, FlightCategory, FlightType } from "./types";

interface EvaluationContext {
  flightCategory: FlightCategory;
  flightType: FlightType;
  departureTimeUtc: string; // ISO string
  airportTimezone: string;  // IANA timezone e.g. "America/New_York"
}

/**
 * Pure function — safe to use both server-side (stop-evaluation API) and
 * client-side (WarningList component). No React or Prisma imports.
 *
 * Returns true if the warning APPLIES given the current flight context.
 * Multiple conditions are AND-ed together.
 */
export function evaluateWarning(
  conditions: TriggerConditions | null | undefined,
  context: EvaluationContext
): boolean {
  // No conditions or explicit always-active → always triggered
  if (!conditions || conditions.alwaysActive === true) return true;

  // Track whether any condition failed
  let triggered = true;

  // international check
  if (conditions.international !== undefined) {
    const isIntl = context.flightCategory === "INTERNATIONAL";
    if (conditions.international !== isIntl) triggered = false;
  }

  // flightType check
  if (conditions.flightType !== undefined) {
    if (conditions.flightType !== context.flightType) triggered = false;
  }

  // timeRange check — convert UTC departure to local airport time
  if (conditions.timeRange && triggered) {
    try {
      const localTimeStr = new Intl.DateTimeFormat("en-GB", {
        timeZone: context.airportTimezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(context.departureTimeUtc));

      // localTimeStr is "HH:MM"
      const [h, m] = localTimeStr.split(":").map(Number);
      const localMins = h * 60 + m;

      const [startH, startM] = conditions.timeRange.start.split(":").map(Number);
      const [endH, endM] = conditions.timeRange.end.split(":").map(Number);
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;

      let inRange: boolean;
      if (startMins <= endMins) {
        // Normal range e.g. 08:00–22:00
        inRange = localMins >= startMins && localMins <= endMins;
      } else {
        // Overnight range e.g. 23:00–06:00
        inRange = localMins >= startMins || localMins <= endMins;
      }

      if (!inRange) triggered = false;
    } catch {
      // If timezone conversion fails, default to triggered (safer)
    }
  }

  // dayOfWeek check
  if (conditions.dayOfWeek && triggered) {
    try {
      const localDay = new Date(
        new Intl.DateTimeFormat("en-US", {
          timeZone: context.airportTimezone,
          weekday: "short",
        }).format(new Date(context.departureTimeUtc))
      ).getDay();
      // Map short weekday back to 0-6
      const dayMap: Record<string, number> = {
        Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
      };
      const formatted = new Intl.DateTimeFormat("en-US", {
        timeZone: context.airportTimezone,
        weekday: "short",
      }).format(new Date(context.departureTimeUtc));
      const dayNum = dayMap[formatted] ?? localDay;

      if (!conditions.dayOfWeek.includes(dayNum)) triggered = false;
    } catch {
      // Default to triggered if conversion fails
    }
  }

  return triggered;
}
