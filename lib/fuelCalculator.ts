import type { FuelCardProvider } from "./types";

// Fuel card discount rates — percentage off the base price
export const FUEL_CARD_DISCOUNTS: Record<FuelCardProvider, number> = {
  EVEREST: 0.10,
  AEG: 0.07,
  WORLD_FUEL: 0.05,
  NONE: 0.0,
};

/**
 * Calculate effective price per gallon after applying fuel card discount.
 * Tax handling: if tax is NOT included, we apply discount to pre-tax price only.
 */
export function effectivePrice(
  basePricePerGal: number,
  fuelCard: FuelCardProvider,
  _taxIncluded: boolean
): number {
  const discount = FUEL_CARD_DISCOUNTS[fuelCard] ?? 0;
  return basePricePerGal * (1 - discount);
}

/**
 * Estimate total fuel cost in USD.
 */
export function estimateFuelCostUsd(
  effectivePricePerGal: number,
  fuelLbs: number,
  densityLbsPerGal: number
): number {
  if (densityLbsPerGal <= 0) return 0;
  const gallons = fuelLbs / densityLbsPerGal;
  return gallons * effectivePricePerGal;
}

/**
 * Calculate range in nautical miles.
 *
 * NOTE: No fuel reserve is applied — this is max theoretical range.
 * The UI should make this clear to the user.
 *
 * @param windAdjustmentKts  positive = headwind (reduces effective speed),
 *                           negative = tailwind (increases effective speed)
 */
export function rangeNm(
  fuelLbs: number,
  burnRateLbsPerHr: number,
  cruiseSpeedKts: number,
  windAdjustmentKts: number
): number {
  if (burnRateLbsPerHr <= 0 || cruiseSpeedKts <= 0) return 0;
  const effectiveSpeedKts = Math.max(cruiseSpeedKts - windAdjustmentKts, 1);
  const enduranceHrs = fuelLbs / burnRateLbsPerHr;
  return Math.round(enduranceHrs * effectiveSpeedKts);
}
