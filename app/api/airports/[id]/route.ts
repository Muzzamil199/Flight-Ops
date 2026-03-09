import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import type { AirportDetailResponse } from "../../../../lib/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const airport = await prisma.airport.findFirst({
      where: {
        OR: [{ id }, { icao: id.toUpperCase() }],
      },
      include: { operations: true },
    });

    if (!airport) {
      return NextResponse.json({ error: "Airport not found" }, { status: 404 });
    }

    const ops = airport.operations;
    const response: AirportDetailResponse = {
      id: airport.id,
      icao: airport.icao,
      iata: airport.iata,
      name: airport.name,
      city: airport.city,
      lat: airport.lat,
      lon: airport.lon,
      elevation: airport.elevation,
      timezone: airport.timezone,
      countryCode: airport.countryCode,
      runwayLength: airport.runwayLength,
      status: airport.status,
      operations: ops
        ? {
            operatesH24: ops.operatesH24,
            towerHoursStart: ops.towerHoursStart,
            towerHoursEnd: ops.towerHoursEnd,
            hasCurfew: ops.hasCurfew,
            curfewType: ops.curfewType,
            curfewStart: ops.curfewStart,
            curfewEnd: ops.curfewEnd,
            curfewPenalty: ops.curfewPenalty,
            curfewExceptions: ops.curfewExceptions,
            noiseMonitoring: ops.noiseMonitoring,
            noiseLimit: ops.noiseLimit,
            noiseLimitPeriod: ops.noiseLimitPeriod,
            permitRequired: ops.permitRequired,
            permitLeadDays: ops.permitLeadDays,
            permitNotes: ops.permitNotes,
            slotsRequired: ops.slotsRequired,
            slotLeadHours: ops.slotLeadHours,
            slotTolerance: ops.slotTolerance,
            customsAvailable: ops.customsAvailable,
            customsH24: ops.customsH24,
            customsHours: ops.customsHours,
            customsLeadHours: ops.customsLeadHours,
            customsLocation: ops.customsLocation,
            handlerMonopoly: ops.handlerMonopoly,
            handlerNames: ops.handlerNames,
            fboCount: ops.fboCount,
            quirks: ops.quirks,
            pprMandatory: ops.pprMandatory,
            parkingLimited: ops.parkingLimited,
            maxParkingDays: ops.maxParkingDays,
            parkingNotes: ops.parkingNotes,
          }
        : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching airport:", error);
    return NextResponse.json(
      { error: "Failed to fetch airport" },
      { status: 500 }
    );
  }
}
