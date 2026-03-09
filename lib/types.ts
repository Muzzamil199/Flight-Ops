// ============================================================================
// Shared TypeScript interfaces — single source of truth for the whole app
// ============================================================================

// ── Aircraft session state (no DB — pure React state) ─────────────────────

export interface AircraftInputs {
  fuelLbs: number;
  burnRateLbsPerHr: number;
  cruiseSpeedKts: number;
  windKts: number; // positive = headwind, negative = tailwind
  fuelDensityLbsPerGal: number; // default 6.7 for Jet-A
}

export interface AircraftPreset {
  label: string;
  burnRateLbsPerHr: number;
  cruiseSpeedKts: number;
  fuelCapLbs: number;
}

export const AIRCRAFT_PRESETS: Record<string, AircraftPreset> = {
  cj3: {
    label: "Citation CJ3+",
    burnRateLbsPerHr: 1400,
    cruiseSpeedKts: 416,
    fuelCapLbs: 5765,
  },
  xls: {
    label: "Citation XLS+",
    burnRateLbsPerHr: 1800,
    cruiseSpeedKts: 441,
    fuelCapLbs: 8200,
  },
  phenom300: {
    label: "Phenom 300E",
    burnRateLbsPerHr: 1100,
    cruiseSpeedKts: 450,
    fuelCapLbs: 5400,
  },
  challenger350: {
    label: "Challenger 350",
    burnRateLbsPerHr: 2400,
    cruiseSpeedKts: 470,
    fuelCapLbs: 13200,
  },
  g450: {
    label: "Gulfstream G450",
    burnRateLbsPerHr: 3800,
    cruiseSpeedKts: 476,
    fuelCapLbs: 29500,
  },
  custom: {
    label: "Custom",
    burnRateLbsPerHr: 0,
    cruiseSpeedKts: 0,
    fuelCapLbs: 0,
  },
};

// ── Flight context ─────────────────────────────────────────────────────────

export type FlightType = "REVENUE" | "NON_REVENUE";
export type FlightCategory = "INTERNATIONAL" | "DOMESTIC";
export type FuelCardProvider = "EVEREST" | "AEG" | "WORLD_FUEL" | "NONE";

export interface FlightContext {
  flightType: FlightType;
  flightCategory: FlightCategory;
  fuelCard: FuelCardProvider;
  departureTimeUtc: string; // ISO string
}

// ── Warning trigger condition shape ───────────────────────────────────────

export interface TriggerConditions {
  international?: boolean;
  flightType?: FlightType;
  timeRange?: { start: string; end: string }; // "HH:MM" local 24hr
  dayOfWeek?: number[]; // 0=Sun, 6=Sat
  alwaysActive?: boolean;
}

// ── Warning filter state ───────────────────────────────────────────────────

export interface ActiveWarningFilters {
  categories: string[]; // empty = show all
  types: string[]; // empty = show all
}

// ── Airport detail API response ────────────────────────────────────────────

export interface AirportDetailResponse {
  id: string;
  icao: string;
  iata: string | null;
  name: string;
  city: string | null;
  lat: number;
  lon: number;
  elevation: number | null;
  timezone: string;
  countryCode: string;
  runwayLength: number | null;
  status: string;
  operations: AirportOperationsDetail | null;
}

export interface AirportOperationsDetail {
  operatesH24: boolean;
  towerHoursStart: string | null;
  towerHoursEnd: string | null;
  hasCurfew: boolean;
  curfewType: string | null;
  curfewStart: string | null;
  curfewEnd: string | null;
  curfewPenalty: string | null;
  curfewExceptions: string | null;
  noiseMonitoring: boolean;
  noiseLimit: number | null;
  noiseLimitPeriod: string | null;
  permitRequired: string;
  permitLeadDays: number;
  permitNotes: string | null;
  slotsRequired: boolean;
  slotLeadHours: number;
  slotTolerance: string | null;
  customsAvailable: boolean;
  customsH24: boolean;
  customsHours: string | null;
  customsLeadHours: number;
  customsLocation: string | null;
  handlerMonopoly: boolean;
  handlerNames: string[];
  fboCount: number;
  quirks: string | null;
  pprMandatory: boolean;
  parkingLimited: boolean;
  maxParkingDays: number | null;
  parkingNotes: string | null;
}

// ── Warning API response ───────────────────────────────────────────────────

export interface WarningRecord {
  id: string;
  type: "INFO" | "WARNING" | "ERROR";
  category: string;
  clarification: string;
  triggerConditions: TriggerConditions | null;
  costMin: number | null;
  costMax: number | null;
  costCurrency: string;
  costType: string | null;
  leadTimeDays: number;
  verifiedDate: string; // ISO string
  status: string;
}

export interface WarningsResponse {
  airportId: string;
  warnings: WarningRecord[];
}

// ── Fuel API response ──────────────────────────────────────────────────────

export interface FuelPriceEntry {
  providerId: string;
  providerName: string;
  providerType: string;
  pricePerGal: number;
  currency: string;
  taxIncluded: boolean;
  effectiveFrom: string | null;
  collectedAt: string;
  effectivePricePerGal: number; // after card discount
  isCheapest: boolean;
}

export interface FuelBreakdownResponse {
  airportId: string;
  prices: FuelPriceEntry[];
  cheapestProviderId: string | null;
}

// ── Stop evaluation ────────────────────────────────────────────────────────

export interface StopEvaluationRequest {
  originIcao: string;
  aircraft: AircraftInputs;
  flightType: FlightType;
  flightCategory: FlightCategory;
  fuelCard: FuelCardProvider;
  departureTimeUtc: string; // ISO string
}

export interface StopCandidate {
  airportId: string;
  icao: string;
  name: string;
  lat: number;
  lon: number;
  distanceNm: number;
  feasibilityStatus: "GO" | "CAUTION" | "NO_GO";
  hardBlockers: string[];
  warningCount: number;
  errorCount: number;
  cheapestFuelPerGal: number | null;
  estimatedFuelCostUsd: number | null;
  rankScore: number;
}

export interface StopEvaluationResponse {
  originIcao: string;
  rangeNm: number;
  candidates: StopCandidate[];
  evaluatedAt: string;
}

// ── API error shape ────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
}
