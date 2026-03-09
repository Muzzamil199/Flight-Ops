import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

export async function GET() {
  try {
    const airports = await prisma.airport.findMany({
      include: {
        operations: true,
        fuelPrices: {
          where: { isLive: true },
          orderBy: { price: "asc" },
          take: 1,
        },
      },
    });

    // Aggregate warning counts per airport in one query
    const warningCounts = await prisma.airportWarning.groupBy({
      by: ["airportId", "type"],
      where: { status: "ACTIVE" },
      _count: { id: true },
    });

    // Build a lookup: airportId → { INFO, WARNING, ERROR }
    const warningMap: Record<string, { INFO: number; WARNING: number; ERROR: number }> = {};
    for (const row of warningCounts) {
      if (!warningMap[row.airportId]) {
        warningMap[row.airportId] = { INFO: 0, WARNING: 0, ERROR: 0 };
      }
      warningMap[row.airportId][row.type as "INFO" | "WARNING" | "ERROR"] = row._count.id;
    }

    // Convert to GeoJSON FeatureCollection for Mapbox
    const geojson = {
      type: "FeatureCollection" as const,
      features: airports.map((airport) => {
        const counts = warningMap[airport.id] ?? { INFO: 0, WARNING: 0, ERROR: 0 };
        return {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [airport.lon, airport.lat],
          },
          properties: {
            id: airport.id,
            icao: airport.icao,
            iata: airport.iata,
            name: airport.name,
            city: airport.city,
            elevation: airport.elevation,
            timezone: airport.timezone,
            countryCode: airport.countryCode,
            runwayLength: airport.runwayLength,
            status: airport.status,
            operations: airport.operations,
            // Warning aggregates for map icon layers (no per-airport requests needed)
            warningCounts: counts,
            hasError: counts.ERROR > 0,
            hasWarning: counts.WARNING > 0,
            cheapestFuelPerGal: airport.fuelPrices[0]?.price ?? null,
          },
        };
      }),
    };

    return NextResponse.json(geojson);
  } catch (error) {
    console.error("Error fetching airports:", error);
    return NextResponse.json(
      { error: "Failed to fetch airports" },
      { status: 500 }
    );
  }
}
