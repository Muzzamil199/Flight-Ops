import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

export async function GET() {
  try {
    const airports = await prisma.airport.findMany({
      include: {
        operations: true,
      },
    });

    // Convert to GeoJSON FeatureCollection for Mapbox
    const geojson = {
      type: "FeatureCollection" as const,
      features: airports.map((airport) => ({
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
        },
      })),
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