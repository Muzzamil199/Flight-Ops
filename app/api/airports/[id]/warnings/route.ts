import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import type { WarningsResponse, WarningRecord, TriggerConditions } from "../../../../../lib/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Resolve airport by ICAO or DB id
    const airport = await prisma.airport.findFirst({
      where: { OR: [{ id }, { icao: id.toUpperCase() }] },
      select: { id: true },
    });

    if (!airport) {
      return NextResponse.json({ error: "Airport not found" }, { status: 404 });
    }

    const warnings = await prisma.airportWarning.findMany({
      where: { airportId: airport.id, status: "ACTIVE" },
      orderBy: [{ type: "asc" }, { category: "asc" }],
    });

    const response: WarningsResponse = {
      airportId: airport.id,
      warnings: warnings.map(
        (w): WarningRecord => ({
          id: w.id,
          type: w.type as "INFO" | "WARNING" | "ERROR",
          category: w.category,
          clarification: w.clarification,
          triggerConditions: w.triggerJson
            ? (w.triggerJson as TriggerConditions)
            : null,
          costMin: w.costMin,
          costMax: w.costMax,
          costCurrency: w.costCurrency,
          costType: w.costType,
          leadTimeDays: w.leadTimeDays,
          verifiedDate: w.verifiedDate.toISOString(),
          status: w.status,
        })
      ),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching warnings:", error);
    return NextResponse.json(
      { error: "Failed to fetch warnings" },
      { status: 500 }
    );
  }
}
