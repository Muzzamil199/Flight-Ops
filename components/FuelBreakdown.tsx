"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FuelBreakdownResponse, FuelCardProvider } from "@/lib/types";
import { FUEL_CARD_DISCOUNTS } from "@/lib/fuelCalculator";

interface Props {
  data: FuelBreakdownResponse;
  fuelLbs: number;
  fuelDensityLbsPerGal: number;
  fuelCard: FuelCardProvider;
}

export default function FuelBreakdown({ data, fuelLbs, fuelDensityLbsPerGal, fuelCard }: Props) {
  if (data.prices.length === 0) {
    return (
      <p className="text-xs text-gray-500 py-2">
        No fuel prices on file for this airport.
      </p>
    );
  }

  const gallons = fuelDensityLbsPerGal > 0 ? fuelLbs / fuelDensityLbsPerGal : 0;
  const discountPct = FUEL_CARD_DISCOUNTS[fuelCard] ?? 0;

  return (
    <div className="space-y-2">
      {discountPct > 0 && (
        <p className="text-[10px] text-teal-400">
          {fuelCard} card: {(discountPct * 100).toFixed(0)}% discount applied
        </p>
      )}

      <div className="rounded border border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700 hover:bg-transparent">
              <TableHead className="text-[10px] text-gray-500 h-7 px-2">Provider</TableHead>
              <TableHead className="text-[10px] text-gray-500 h-7 px-2 text-right">Base $/gal</TableHead>
              <TableHead className="text-[10px] text-gray-500 h-7 px-2 text-right">Net $/gal</TableHead>
              <TableHead className="text-[10px] text-gray-500 h-7 px-2 text-right">Est. Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.prices.map((p) => {
              const estTotal = gallons * p.effectivePricePerGal;
              return (
                <TableRow
                  key={p.providerId}
                  className={`border-gray-700 hover:bg-gray-800/50 ${
                    p.isCheapest ? "border-l-2 border-l-teal-500" : ""
                  }`}
                >
                  <TableCell className="text-xs px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      {p.isCheapest && (
                        <span className="text-[9px] text-teal-400 font-bold">★</span>
                      )}
                      <span className={p.isCheapest ? "text-teal-300" : "text-gray-300"}>
                        {p.providerName}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-600 capitalize">{p.providerType}</span>
                  </TableCell>
                  <TableCell className="text-xs text-gray-400 text-right px-2 py-1.5">
                    ${p.pricePerGal.toFixed(2)}
                  </TableCell>
                  <TableCell className={`text-xs text-right px-2 py-1.5 font-medium ${p.isCheapest ? "text-teal-300" : "text-white"}`}>
                    ${p.effectivePricePerGal.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs text-gray-300 text-right px-2 py-1.5">
                    {gallons > 0 ? `$${Math.round(estTotal).toLocaleString()}` : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {gallons > 0 && (
        <p className="text-[10px] text-gray-600">
          Based on {Math.round(gallons).toLocaleString()} gal ({fuelLbs.toLocaleString()} lbs at {fuelDensityLbsPerGal} lb/gal)
        </p>
      )}
    </div>
  );
}
