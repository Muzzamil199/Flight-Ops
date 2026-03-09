import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { rangeNm, effectivePrice } from "../../../lib/fuelCalculator";
import { buildRangeCircle, airportsWithinRange, distanceBetweenNm } from "../../../lib/rangeCalculator";
import { evaluateWarning } from "../../../lib/warningEvaluator";
import type {
  StopEvaluationRequest,
  StopEvaluationResponse,
  StopCandidate,
  TriggerConditions,
} from "../../../lib/types";

export async function POST(req: Request) {
  try {
    const body: StopEvaluationRequest = await req.json();
    const { originIcao, aircraft, flightType, flightCategory, fuelCard, departureTimeUtc } = body;

    if (!originIcao || !aircraft) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Resolve origin airport
    const origin = await prisma.airport.findFirst({
      where: { icao: originIcao.toUpperCase() },
      select: { id: true, icao: true, lat: true, lon: true },
    });

    if (!origin) {
      return NextResponse.json({ error: "Origin airport not found" }, { status: 404 });
    }

    // Calculate range
    const computedRangeNm = rangeNm(
      aircraft.fuelLbs,
      aircraft.burnRateLbsPerHr,
      aircraft.cruiseSpeedKts,
      aircraft.windKts
    );

    if (computedRangeNm <= 0) {
      return NextResponse.json({ error: "Invalid aircraft inputs — range is 0" }, { status: 400 });
    }

    // Build range circle
    const circle = buildRangeCircle(origin.lon, origin.lat, computedRangeNm);

    // Fetch all airports with operations + active warnings + cheapest fuel
    const allAirports = await prisma.airport.findMany({
      where: { status: "active", NOT: { icao: originIcao.toUpperCase() } },
      include: {
        operations: true,
        warnings: {
          where: { status: "ACTIVE" },
        },
        fuelPrices: {
          where: { isLive: true },
          orderBy: { price: "asc" },
          take: 3,
        },
      },
    });

    // Filter to airports within range
    const inRangeIds = airportsWithinRange(
      allAirports.map((a) => ({ id: a.id, lon: a.lon, lat: a.lat })),
      circle
    );
    const inRangeSet = new Set(inRangeIds);
    const candidates = allAirports.filter((a) => inRangeSet.has(a.id));

    // Score each candidate
    const scored: StopCandidate[] = candidates.map((airport) => {
      const ops = airport.operations;
      const distanceNm = distanceBetweenNm(origin.lon, origin.lat, airport.lon, airport.lat);

      // Evaluate warnings
      const triggered = airport.warnings.filter((w) =>
        evaluateWarning(w.triggerJson as TriggerConditions | null, {
          flightCategory,
          flightType,
          departureTimeUtc,
          airportTimezone: airport.timezone,
        })
      );

      const errorCount = triggered.filter((w) => w.type === "ERROR").length;
      const warningCount = triggered.filter((w) => w.type === "WARNING").length;

      // Hard blockers: CURFEW or PERMIT errors that are triggered
      const hardBlockers: string[] = [];
      if (ops?.hasCurfew) {
        const curfewWarning = triggered.find((w) => w.category === "CURFEW" && w.type === "ERROR");
        if (curfewWarning) hardBlockers.push("Active curfew restriction");
      }
      if (ops?.permitRequired && ops.permitRequired !== "NONE" && flightCategory === "INTERNATIONAL") {
        const permitError = triggered.find((w) => w.category === "PERMIT" && w.type === "ERROR");
        if (permitError) hardBlockers.push(`Permit required: ${ops.permitRequired}`);
      }

      // Feasibility
      const feasibilityStatus: "GO" | "CAUTION" | "NO_GO" =
        hardBlockers.length > 0 ? "NO_GO" : errorCount > 0 ? "CAUTION" : "GO";

      // Cheapest fuel price after card discount
      let cheapestFuelPerGal: number | null = null;
      let estimatedFuelCostUsd: number | null = null;

      if (airport.fuelPrices.length > 0) {
        const effective = airport.fuelPrices.map((fp) =>
          effectivePrice(fp.price, fuelCard, fp.taxIncluded)
        );
        cheapestFuelPerGal = Math.min(...effective);
        const density = aircraft.fuelDensityLbsPerGal || 6.7;
        estimatedFuelCostUsd = (aircraft.fuelLbs / density) * cheapestFuelPerGal;
      }

      // Scoring: lower is better
      const fuelScore = cheapestFuelPerGal ?? 15; // penalize unknown fuel
      const warningPenalty = errorCount * 3 + warningCount * 1 + hardBlockers.length * 10;
      const deviationScore = distanceNm / 100;
      const rankScore = fuelScore * 0.5 + warningPenalty * 0.3 + deviationScore * 0.2;

      return {
        airportId: airport.id,
        icao: airport.icao,
        name: airport.name,
        lat: airport.lat,
        lon: airport.lon,
        distanceNm: Math.round(distanceNm),
        feasibilityStatus,
        hardBlockers,
        warningCount,
        errorCount,
        cheapestFuelPerGal,
        estimatedFuelCostUsd: estimatedFuelCostUsd ? Math.round(estimatedFuelCostUsd) : null,
        rankScore,
      };
    });

    // Sort by rank score ascending, return top 20
    scored.sort((a, b) => a.rankScore - b.rankScore);
    const top20 = scored.slice(0, 20);

    const response: StopEvaluationResponse = {
      originIcao: originIcao.toUpperCase(),
      rangeNm: computedRangeNm,
      candidates: top20,
      evaluatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Stop evaluation error:", error);
    return NextResponse.json(
      { error: "Stop evaluation failed" },
      { status: 500 }
    );
  }
}
