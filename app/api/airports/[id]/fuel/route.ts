import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { effectivePrice, FUEL_CARD_DISCOUNTS } from "../../../../../lib/fuelCalculator";
import type { FuelBreakdownResponse, FuelPriceEntry, FuelCardProvider } from "../../../../../lib/types";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const fuelCard = (searchParams.get("fuelCard") ?? "NONE") as FuelCardProvider;

  // Validate fuelCard value
  if (!Object.keys(FUEL_CARD_DISCOUNTS).includes(fuelCard)) {
    return NextResponse.json({ error: "Invalid fuelCard value" }, { status: 400 });
  }

  try {
    const airport = await prisma.airport.findFirst({
      where: { OR: [{ id }, { icao: id.toUpperCase() }] },
      select: { id: true },
    });

    if (!airport) {
      return NextResponse.json({ error: "Airport not found" }, { status: 404 });
    }

    const records = await prisma.fuelPriceRecord.findMany({
      where: { airportId: airport.id, isLive: true },
      include: { fuelProvider: true },
      orderBy: { collectedAt: "desc" },
    });

    // Compute effective prices
    const prices: FuelPriceEntry[] = records.map((r) => ({
      providerId: r.fuelProviderId,
      providerName: r.fuelProvider.name,
      providerType: r.fuelProvider.providerType,
      pricePerGal: r.price,
      currency: r.currency,
      taxIncluded: r.taxIncluded,
      effectiveFrom: r.effectiveFrom?.toISOString() ?? null,
      collectedAt: r.collectedAt.toISOString(),
      effectivePricePerGal: effectivePrice(r.price, fuelCard, r.taxIncluded),
      isCheapest: false, // set below
    }));

    // Mark cheapest
    let cheapestId: string | null = null;
    if (prices.length > 0) {
      const cheapest = prices.reduce((a, b) =>
        a.effectivePricePerGal <= b.effectivePricePerGal ? a : b
      );
      cheapest.isCheapest = true;
      cheapestId = cheapest.providerId;
    }

    const response: FuelBreakdownResponse = {
      airportId: airport.id,
      prices,
      cheapestProviderId: cheapestId,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching fuel prices:", error);
    return NextResponse.json(
      { error: "Failed to fetch fuel prices" },
      { status: 500 }
    );
  }
}
