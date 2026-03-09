import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// ── Phase 1: Airport + operations ─────────────────────────────────────────

async function seedAirports() {
  const filePath = path.join(__dirname, "..", "airports-75.geojson");
  const raw = fs.readFileSync(filePath, "utf-8");
  const geojson = JSON.parse(raw);

  console.log(`Found ${geojson.features.length} airports. Seeding...`);

  for (const feature of geojson.features) {
    const props = feature.properties;
    const [lon, lat] = feature.geometry.coordinates;
    const ops = props.operations || {};

    const airport = await prisma.airport.upsert({
      where: { icao: props.icao },
      update: {},
      create: {
        icao: props.icao,
        iata: props.iata || null,
        name: props.name,
        city: props.city || null,
        lat,
        lon,
        elevation: props.elevation || null,
        timezone: props.timezone,
        countryCode: props.countryCode,
        runwayLength: props.runwayLength || null,
        status: props.status || "active",
      },
    });

    await prisma.airportOperations.upsert({
      where: { airportId: airport.id },
      update: {},
      create: {
        airportId: airport.id,
        towerHoursStart: ops.towerHoursStart || null,
        towerHoursEnd: ops.towerHoursEnd || null,
        operatesH24: ops.operatesH24 ?? false,
        operatingNotes: ops.operatingNotes || null,
        hasCurfew: ops.hasCurfew ?? false,
        curfewType: ops.curfewType || null,
        curfewStart: ops.curfewStart || null,
        curfewEnd: ops.curfewEnd || null,
        curfewExceptions: ops.curfewExceptions || null,
        curfewPenalty: ops.curfewPenalty || null,
        noiseLimit: ops.noiseLimit || null,
        noiseLimitPeriod: ops.noiseLimitPeriod || null,
        noiseMonitoring: ops.noiseMonitoring ?? false,
        permitRequired: ops.permitRequired || "NONE",
        permitLeadDays: ops.permitLeadDays || 0,
        permitNotes: ops.permitNotes || null,
        slotsRequired: ops.slotsRequired ?? false,
        slotLeadHours: ops.slotLeadHours || 0,
        slotTolerance: ops.slotTolerance || null,
        customsAvailable: ops.customsAvailable ?? false,
        customsH24: ops.customsH24 ?? false,
        customsHours: ops.customsHours || null,
        customsLeadHours: ops.customsLeadHours || 0,
        customsLocation: ops.customsLocation || null,
        handlerMonopoly: ops.handlerMonopoly ?? false,
        handlerNames: ops.handlerNames || [],
        fboCount: ops.fboCount || 0,
        quirks: ops.quirks || null,
        pprMandatory: ops.pprMandatory ?? false,
        pprLeadHours: ops.pprLeadHours || 0,
        parkingLimited: ops.parkingLimited ?? false,
        maxParkingDays: ops.maxParkingDays || null,
        parkingNotes: ops.parkingNotes || null,
      },
    });

    console.log(`✅ ${props.icao} - ${props.name}`);
  }

  console.log(`\nDone! Seeded ${geojson.features.length} airports.\n`);
}

// ── Phase 2: Fuel providers, prices, and warnings ──────────────────────────

async function seedFuelAndWarnings() {
  const existingWarnings = await prisma.airportWarning.count();
  const existingFuelPrices = await prisma.fuelPriceRecord.count();
  if (existingWarnings > 0 && existingFuelPrices > 0) {
    console.log("⏭️  Fuel prices and warnings already seeded. Skipping Phase 2.\n");
    return;
  }

  console.log("🔋 Seeding fuel providers, prices, and warnings...\n");

  // ── Fuel Providers ─────────────────────────────────────────────────────
  const [everest, worldFuel, avfuel] = await Promise.all([
    prisma.fuelProvider.upsert({
      where: { name: "Everest Aviation Fuel" },
      update: {},
      create: { name: "Everest Aviation Fuel", providerType: "aggregator" },
    }),
    prisma.fuelProvider.upsert({
      where: { name: "World Fuel Services" },
      update: {},
      create: { name: "World Fuel Services", providerType: "aggregator" },
    }),
    prisma.fuelProvider.upsert({
      where: { name: "Avfuel" },
      update: {},
      create: { name: "Avfuel", providerType: "direct" },
    }),
  ]);

  console.log("✅ Fuel providers created");

  // ── Mock Source ────────────────────────────────────────────────────────
  const mockSource = await prisma.source.create({
    data: {
      sourceType: "INTERNAL_NOTES",
      reference: "seed-mock-data-v1",
      capturedAt: new Date("2025-01-15"),
      capturedBy: "seed",
    },
  });

  console.log("✅ Mock source created");

  // ── Airport ID cache ───────────────────────────────────────────────────
  const airportCache: Record<string, string> = {};
  async function getAirportId(icao: string): Promise<string | null> {
    if (airportCache[icao]) return airportCache[icao];
    const airport = await prisma.airport.findUnique({ where: { icao }, select: { id: true } });
    if (airport) airportCache[icao] = airport.id;
    return airport?.id ?? null;
  }

  // ── Fuel Prices ────────────────────────────────────────────────────────
  // [ICAO, everestPrice, worldFuelPrice, avfuelPrice] — null = not available
  const fuelData: [string, number | null, number | null, number | null][] = [
    ["KTEB",  7.20,  6.95,  7.10],
    ["KBED",  6.80,  6.60,  6.75],
    ["KDCA",  7.85,  7.60,  null],
    ["KPDK",  6.40,  6.25,  6.35],
    ["KVNY",  7.95,  7.70,  7.85],
    ["KSAN",  7.50,  7.30,  null],
    ["KLAS",  6.90,  6.70,  6.80],
    ["KJFK",  8.20,  7.95,  null],
    ["KBOS",  7.40,  7.20,  7.35],
    ["KMIA",  7.10,  6.90,  7.00],
    ["KAPA",  6.30,  6.15,  6.25],
    ["KORD",  7.60,  7.40,  null],
    ["KSDL",  6.50,  6.35,  6.45],
    ["KPHX",  6.85,  6.65,  6.75],
    ["LFPB",  10.20, 9.95,  null],
    ["EGLL",  11.50, 11.20, null],
    ["EGLF",  10.80, 10.55, null],
    ["LSZH",  10.40, 10.10, null],
    ["EHAM",  10.60, 10.35, null],
    ["EGGW",  10.10, 9.85,  null],
    ["LFMN",  9.90,  9.65,  null],
    ["EBBR",  10.30, 10.05, null],
    ["ESSA",  9.80,  9.55,  null],
    ["OMDB",  7.80,  7.55,  null],
    ["OMAA",  7.60,  7.40,  null],
    ["OEJN",  7.20,  7.00,  null],
    ["OERK",  6.90,  6.70,  null],
    ["OTHH",  7.40,  7.20,  null],
    ["VHHH",  9.50,  9.25,  null],
    ["WSSS",  9.20,  9.00,  null],
    ["VIDP",  8.60,  8.40,  null],
    ["ZBAA",  8.30,  8.10,  null],
  ];

  let fuelCount = 0;
  for (const [icao, ePrice, wfPrice, avPrice] of fuelData) {
    const airportId = await getAirportId(icao);
    if (!airportId) continue;

    const entries = [
      ePrice !== null ? { provider: everest, price: ePrice } : null,
      wfPrice !== null ? { provider: worldFuel, price: wfPrice } : null,
      avPrice !== null ? { provider: avfuel, price: avPrice } : null,
    ].filter(Boolean) as { provider: typeof everest; price: number }[];

    for (const entry of entries) {
      await prisma.fuelPriceRecord.create({
        data: {
          airportId,
          fuelProviderId: entry.provider.id,
          price: entry.price,
          currency: "USD",
          unit: "USD/GAL",
          taxIncluded: false,
          isLive: true,
          effectiveFrom: new Date("2025-01-01"),
          collectedAt: new Date("2025-01-15"),
          sourceId: mockSource.id,
        },
      });
      fuelCount++;
    }
  }
  console.log(`✅ ${fuelCount} fuel price records created`);

  // ── Airport Warnings ───────────────────────────────────────────────────
  type WarningRow = {
    icao: string;
    type: "INFO" | "WARNING" | "ERROR";
    category: string;
    triggerJson: object | null;
    clarification: string;
    costMin: number | null;
    costMax: number | null;
    costCurrency: string;
    costType: string | null;
    leadTimeDays: number;
  };

  const warningData: WarningRow[] = [
    // CURFEW — timeRange trigger
    { icao: "KTEB",  type: "ERROR",   category: "CURFEW",      triggerJson: { timeRange: { start: "23:00", end: "06:00" } }, clarification: "Hard curfew 23:00-06:00 local. Departures after 22:30 require prior approval.", costMin: 2000,  costMax: 10000, costCurrency: "USD", costType: "PENALTY",         leadTimeDays: 0 },
    { icao: "KDCA",  type: "ERROR",   category: "CURFEW",      triggerJson: { timeRange: { start: "22:00", end: "07:00" } }, clarification: "DCA night ops restricted 22:00-07:00. Violations carry heavy FAA penalties.",  costMin: 5000,  costMax: 20000, costCurrency: "USD", costType: "PENALTY",         leadTimeDays: 0 },
    { icao: "EGLF",  type: "ERROR",   category: "CURFEW",      triggerJson: { timeRange: { start: "23:00", end: "07:00" } }, clarification: "Farnborough hard curfew 23:00-07:00 LT. No exceptions. MEDEVAC only.",        costMin: null,  costMax: null,  costCurrency: "GBP", costType: null,              leadTimeDays: 0 },
    { icao: "EGLL",  type: "WARNING", category: "CURFEW",      triggerJson: { timeRange: { start: "23:30", end: "06:00" } }, clarification: "Heathrow night quota 23:30-06:00. Noise quota points consumed per movement.",  costMin: 3000,  costMax: 15000, costCurrency: "GBP", costType: "QUOTA_PENALTY",   leadTimeDays: 0 },
    { icao: "LSZH",  type: "ERROR",   category: "CURFEW",      triggerJson: { timeRange: { start: "00:00", end: "06:00" } }, clarification: "Zurich hard curfew midnight-06:00. No night movements permitted.",             costMin: null,  costMax: null,  costCurrency: "CHF", costType: null,              leadTimeDays: 0 },
    { icao: "EHAM",  type: "WARNING", category: "CURFEW",      triggerJson: { timeRange: { start: "23:00", end: "06:00" } }, clarification: "Amsterdam night restriction 23:00-06:00. Slots required and heavily limited.", costMin: 1000,  costMax: 5000,  costCurrency: "EUR", costType: "PENALTY",         leadTimeDays: 0 },
    { icao: "LFPB",  type: "WARNING", category: "CURFEW",      triggerJson: { timeRange: { start: "00:00", end: "05:00" } }, clarification: "Le Bourget restricted midnight-05:00. Prior Paris ATC authorization needed.",  costMin: null,  costMax: null,  costCurrency: "EUR", costType: null,              leadTimeDays: 1 },
    { icao: "LIML",  type: "ERROR",   category: "CURFEW",      triggerJson: { timeRange: { start: "23:00", end: "07:00" } }, clarification: "Milan Linate hard curfew 23:00-07:00. Airport closes completely.",            costMin: null,  costMax: null,  costCurrency: "EUR", costType: null,              leadTimeDays: 0 },
    { icao: "EBBR",  type: "WARNING", category: "CURFEW",      triggerJson: { timeRange: { start: "23:00", end: "06:00" } }, clarification: "Brussels 23:00-06:00 night restriction. Noise chapter limits enforced.",      costMin: 2000,  costMax: 8000,  costCurrency: "EUR", costType: "PENALTY",         leadTimeDays: 0 },
    { icao: "LFMN",  type: "WARNING", category: "CURFEW",      triggerJson: { timeRange: { start: "00:00", end: "06:00" } }, clarification: "Nice restricted midnight-06:00. VIP movements may apply for exceptions.",     costMin: null,  costMax: null,  costCurrency: "EUR", costType: null,              leadTimeDays: 1 },
    { icao: "ESSA",  type: "WARNING", category: "CURFEW",      triggerJson: { timeRange: { start: "22:00", end: "07:00" } }, clarification: "Stockholm Arlanda night quota 22:00-07:00. Quota point charges apply.",       costMin: 1500,  costMax: 6000,  costCurrency: "SEK", costType: "QUOTA",           leadTimeDays: 0 },
    // NOISE
    { icao: "ESSA",  type: "WARNING", category: "NOISE",       triggerJson: { timeRange: { start: "22:00", end: "07:00" } }, clarification: "Noise monitoring active 22:00-07:00. Violations may result in surcharge.",   costMin: 500,   costMax: 3000,  costCurrency: "SEK", costType: "SURCHARGE",       leadTimeDays: 0 },
    { icao: "EGLL",  type: "WARNING", category: "NOISE",       triggerJson: { timeRange: { start: "23:00", end: "07:00" } }, clarification: "Heathrow noise monitoring night period. Chapter 14 min required. 3dB limit.", costMin: 1000,  costMax: 10000, costCurrency: "GBP", costType: "SURCHARGE",       leadTimeDays: 0 },
    { icao: "LSZH",  type: "WARNING", category: "NOISE",       triggerJson: { alwaysActive: true },                          clarification: "Zurich enforces strict noise limits year-round. Fines up to CHF 50,000.",      costMin: 5000,  costMax: 50000, costCurrency: "CHF", costType: "FINE",             leadTimeDays: 0 },
    { icao: "KTEB",  type: "WARNING", category: "NOISE",       triggerJson: { alwaysActive: true },                          clarification: "PTNA program — 3 violations = permanent ban. Stage 4 aircraft recommended.",   costMin: 500,   costMax: 3000,  costCurrency: "USD", costType: "FINE",             leadTimeDays: 0 },
    { icao: "EGLF",  type: "WARNING", category: "NOISE",       triggerJson: { alwaysActive: true },                          clarification: "Farnborough noise quota system. Points deducted per movement. Seasonal caps.", costMin: null,  costMax: null,  costCurrency: "GBP", costType: null,              leadTimeDays: 0 },
    { icao: "LFMN",  type: "WARNING", category: "NOISE",       triggerJson: { alwaysActive: true },                          clarification: "Nice strict noise limits. Night departures require specific routing.",          costMin: 500,   costMax: 5000,  costCurrency: "EUR", costType: "FINE",             leadTimeDays: 0 },
    // PERMIT — international trigger
    { icao: "KDCA",  type: "ERROR",   category: "PERMIT",      triggerJson: { international: true },                         clarification: "DCA: International ops require ADAP waiver + TSA approval. Apply 72h min.",   costMin: 500,   costMax: 2000,  costCurrency: "USD", costType: "PERMIT_FEE",      leadTimeDays: 3 },
    { icao: "OEJN",  type: "ERROR",   category: "PERMIT",      triggerJson: { international: true },                         clarification: "Jeddah: Landing permit from GACA minimum 48h advance for foreign operators.", costMin: 300,   costMax: 1500,  costCurrency: "USD", costType: "PERMIT_FEE",      leadTimeDays: 2 },
    { icao: "OERK",  type: "ERROR",   category: "PERMIT",      triggerJson: { international: true },                         clarification: "Riyadh: Diplomatic clearance required. GAS permit + SAA handler mandatory.",  costMin: 500,   costMax: 3000,  costCurrency: "USD", costType: "PERMIT_FEE",      leadTimeDays: 5 },
    { icao: "OTHH",  type: "ERROR",   category: "PERMIT",      triggerJson: { international: true },                         clarification: "Doha: CAA Qatar landing permit. Non-Gulf operators: 24h advance submission.", costMin: 200,   costMax: 1000,  costCurrency: "USD", costType: "PERMIT_FEE",      leadTimeDays: 1 },
    { icao: "OMDB",  type: "WARNING", category: "PERMIT",      triggerJson: { international: true },                         clarification: "Dubai: GCAA landing permit required. 24h advance recommended.",               costMin: 150,   costMax: 800,   costCurrency: "USD", costType: "PERMIT_FEE",      leadTimeDays: 1 },
    { icao: "ZBAA",  type: "ERROR",   category: "PERMIT",      triggerJson: { international: true },                         clarification: "Beijing: CAAC landing permit 5 business days advance. CGAS mandatory.",       costMin: 800,   costMax: 3000,  costCurrency: "USD", costType: "PERMIT_FEE",      leadTimeDays: 5 },
    { icao: "VIDP",  type: "ERROR",   category: "PERMIT",      triggerJson: { international: true },                         clarification: "Delhi: DGCA NOC min 72h. Overflight clearance via MEA if over Pakistan.",     costMin: 400,   costMax: 2000,  costCurrency: "USD", costType: "PERMIT_FEE",      leadTimeDays: 3 },
    { icao: "RPLL",  type: "ERROR",   category: "PERMIT",      triggerJson: { international: true },                         clarification: "Manila: CAAP landing permit 48h advance. Diplomatic note may be needed.",     costMin: 300,   costMax: 1500,  costCurrency: "USD", costType: "PERMIT_FEE",      leadTimeDays: 2 },
    { icao: "LLBG",  type: "ERROR",   category: "PERMIT",      triggerJson: { international: true },                         clarification: "Tel Aviv: IAA security screening mandatory. Security agent required.",         costMin: 500,   costMax: 3000,  costCurrency: "USD", costType: "SECURITY_FEE",    leadTimeDays: 2 },
    { icao: "ORBI",  type: "ERROR",   category: "PERMIT",      triggerJson: { international: true },                         clarification: "Baghdad: Diplomatic permit via Iraqi DGCA. Minimum 7 days advance notice.",   costMin: 1000,  costMax: 5000,  costCurrency: "USD", costType: "PERMIT_FEE",      leadTimeDays: 7 },
    { icao: "OKBK",  type: "ERROR",   category: "PERMIT",      triggerJson: { international: true },                         clarification: "Kuwait: DGCA permit 48h advance. Specific handler arrangement required.",      costMin: 300,   costMax: 1500,  costCurrency: "USD", costType: "PERMIT_FEE",      leadTimeDays: 2 },
    { icao: "OPRN",  type: "ERROR",   category: "PERMIT",      triggerJson: { international: true },                         clarification: "Islamabad: CAA Pakistan permit min 72h. Security screening adds 2-3h.",       costMin: 500,   costMax: 2000,  costCurrency: "USD", costType: "PERMIT_FEE",      leadTimeDays: 3 },
    { icao: "VCBI",  type: "ERROR",   category: "PERMIT",      triggerJson: { international: true },                         clarification: "Colombo: CAASL permit 48h advance. Alcohol/cargo restrictions apply.",        costMin: 300,   costMax: 1200,  costCurrency: "USD", costType: "PERMIT_FEE",      leadTimeDays: 2 },
    { icao: "VVTS",  type: "ERROR",   category: "PERMIT",      triggerJson: { international: true },                         clarification: "Ho Chi Minh: CAAV landing permit 72h. Flight plan 24h advance. Handler req.", costMin: 400,   costMax: 2000,  costCurrency: "USD", costType: "PERMIT_FEE",      leadTimeDays: 3 },
    { icao: "VVNB",  type: "ERROR",   category: "PERMIT",      triggerJson: { international: true },                         clarification: "Hanoi: CAAV permit 72h. MoD overflight required. Handler mandatory.",         costMin: 400,   costMax: 2000,  costCurrency: "USD", costType: "PERMIT_FEE",      leadTimeDays: 3 },
    // SLOTS — alwaysActive
    { icao: "EGLL",  type: "WARNING", category: "SLOTS",       triggerJson: { alwaysActive: true },                          clarification: "Heathrow slot coordinated. ACL slot required min 1 week. Peak: nearly impossible.", costMin: null, costMax: null, costCurrency: "GBP", costType: null,             leadTimeDays: 7 },
    { icao: "LFPB",  type: "WARNING", category: "SLOTS",       triggerJson: { alwaysActive: true },                          clarification: "Le Bourget slot required. DGAC coordination. Air Show: 6-month advance.",     costMin: null,  costMax: null,  costCurrency: "EUR", costType: null,              leadTimeDays: 3 },
    { icao: "LSZH",  type: "WARNING", category: "SLOTS",       triggerJson: { alwaysActive: true },                          clarification: "Zurich slot coordinated by ACG. Early morning slots extremely limited.",       costMin: null,  costMax: null,  costCurrency: "CHF", costType: null,              leadTimeDays: 3 },
    { icao: "OMDB",  type: "INFO",    category: "SLOTS",       triggerJson: { alwaysActive: true },                          clarification: "Dubai: PPR required for GA apron. Contact handler 12h minimum before arrival.", costMin: null, costMax: null,  costCurrency: "USD", costType: null,              leadTimeDays: 0 },
    { icao: "EBBR",  type: "WARNING", category: "SLOTS",       triggerJson: { alwaysActive: true },                          clarification: "Brussels slot coordinated. BSCA ATC slot required. +/- 15min tolerance.",     costMin: null,  costMax: null,  costCurrency: "EUR", costType: null,              leadTimeDays: 2 },
    { icao: "OERK",  type: "WARNING", category: "SLOTS",       triggerJson: { alwaysActive: true },                          clarification: "Riyadh: PPR required and handler coordination. Slots limited on VIP days.",   costMin: null,  costMax: null,  costCurrency: "USD", costType: null,              leadTimeDays: 3 },
    { icao: "KDCA",  type: "WARNING", category: "SLOTS",       triggerJson: { alwaysActive: true },                          clarification: "DCA slot controlled: 60 daily ops limit. ATCS slot authorization via FAA.",   costMin: null,  costMax: null,  costCurrency: "USD", costType: null,              leadTimeDays: 1 },
    { icao: "ZBAA",  type: "WARNING", category: "SLOTS",       triggerJson: { alwaysActive: true },                          clarification: "Beijing GA operations heavily restricted. Slots rare — use ZSNJ alternate.",   costMin: null,  costMax: null,  costCurrency: "CNY", costType: null,              leadTimeDays: 7 },
    // HANDLING — alwaysActive
    { icao: "KDCA",  type: "INFO",    category: "HANDLING",    triggerJson: { alwaysActive: true },                          clarification: "Signature FBO monopoly at DCA. Minimum handling fees apply.",                  costMin: 800,   costMax: 2500,  costCurrency: "USD", costType: "HANDLING",        leadTimeDays: 0 },
    { icao: "KTEB",  type: "INFO",    category: "HANDLING",    triggerJson: { alwaysActive: true },                          clarification: "Multiple FBOs (Meridian, Jet Aviation, Signature). High demand — confirm parking.", costMin: 600, costMax: 1800, costCurrency: "USD", costType: "HANDLING",        leadTimeDays: 0 },
    { icao: "EGLF",  type: "INFO",    category: "HANDLING",    triggerJson: { alwaysActive: true },                          clarification: "TAG Farnborough monopoly handler. Mandatory use. Premium pricing.",            costMin: 2000,  costMax: 6000,  costCurrency: "GBP", costType: "HANDLING",        leadTimeDays: 0 },
    { icao: "EGLL",  type: "INFO",    category: "HANDLING",    triggerJson: { alwaysActive: true },                          clarification: "Signature or Harrods Aviation. Premium charges. Lounge fees extra.",           costMin: 3000,  costMax: 8000,  costCurrency: "GBP", costType: "HANDLING",        leadTimeDays: 0 },
    { icao: "LSZH",  type: "INFO",    category: "HANDLING",    triggerJson: { alwaysActive: true },                          clarification: "Jet Aviation Zurich — monopoly for bizav. Outstanding service, premium pricing.", costMin: 1500, costMax: 5000, costCurrency: "CHF", costType: "HANDLING",        leadTimeDays: 0 },
    { icao: "OMDB",  type: "INFO",    category: "HANDLING",    triggerJson: { alwaysActive: true },                          clarification: "ExecuJet or DC Aviation Al Futtaim. Advance parking confirmation required.",    costMin: 1000,  costMax: 4000,  costCurrency: "USD", costType: "HANDLING",        leadTimeDays: 0 },
    { icao: "OERK",  type: "INFO",    category: "HANDLING",    triggerJson: { alwaysActive: true },                          clarification: "Saudia Aviation mandatory handler. Alcohol strictly prohibited in KSA.",        costMin: 2000,  costMax: 6000,  costCurrency: "USD", costType: "HANDLING",        leadTimeDays: 0 },
    { icao: "PANC",  type: "INFO",    category: "HANDLING",    triggerJson: { alwaysActive: true },                          clarification: "Anchorage popular trans-Pacific tech stop. FBO availability varies — book early.", costMin: 400, costMax: 1200, costCurrency: "USD", costType: "HANDLING",        leadTimeDays: 0 },
    { icao: "LIRA",  type: "INFO",    category: "HANDLING",    triggerJson: { alwaysActive: true },                          clarification: "Rome Ciampino: Carter/Aviapartner handlers. Parking limited at peak.",          costMin: 800,   costMax: 2500,  costCurrency: "EUR", costType: "HANDLING",        leadTimeDays: 0 },
    { icao: "FACT",  type: "INFO",    category: "HANDLING",    triggerJson: { alwaysActive: true },                          clarification: "Cape Town: ExecuJet handler. Confirm arrival — seasonal demand spikes.",         costMin: 600,   costMax: 2000,  costCurrency: "USD", costType: "HANDLING",        leadTimeDays: 0 },
    { icao: "HKJK",  type: "INFO",    category: "HANDLING",    triggerJson: { alwaysActive: true },                          clarification: "Nairobi Wilson or JKIA — confirm which airfield. Wilson preferred for bizav.", costMin: 500,   costMax: 1800,  costCurrency: "USD", costType: "HANDLING",        leadTimeDays: 0 },
    { icao: "WSSS",  type: "INFO",    category: "HANDLING",    triggerJson: { alwaysActive: true },                          clarification: "Singapore: bizav via T4 or Seletar (WSSL). Seletar strongly preferred.",        costMin: 1200,  costMax: 4000,  costCurrency: "SGD", costType: "HANDLING",        leadTimeDays: 0 },
    { icao: "VHHH",  type: "INFO",    category: "HANDLING",    triggerJson: { alwaysActive: true },                          clarification: "Hong Kong: Haeco/China Airlines handler. Bizav apron limited — slot essential.", costMin: 1500, costMax: 5000, costCurrency: "HKD", costType: "HANDLING",        leadTimeDays: 0 },
    // SECURITY — alwaysActive
    { icao: "LLBG",  type: "INFO",    category: "SECURITY",    triggerJson: { alwaysActive: true },                          clarification: "Ben Gurion: ISA security screening all pax. Arrive 3h before departure.",      costMin: null,  costMax: null,  costCurrency: "USD", costType: null,              leadTimeDays: 0 },
    { icao: "ORBI",  type: "INFO",    category: "SECURITY",    triggerJson: { alwaysActive: true },                          clarification: "Baghdad: Armed escorts mandatory airside. Coordinate with handler 48h prior.",  costMin: 500,   costMax: 2000,  costCurrency: "USD", costType: "SECURITY_FEE",    leadTimeDays: 2 },
    // PARKING — alwaysActive
    { icao: "KTEB",  type: "WARNING", category: "PARKING",     triggerJson: { alwaysActive: true },                          clarification: "Teterboro: parking highly limited, especially weekends. Pre-confirm ramp.",     costMin: null,  costMax: null,  costCurrency: "USD", costType: null,              leadTimeDays: 0 },
    { icao: "EGLL",  type: "WARNING", category: "PARKING",     triggerJson: { alwaysActive: true },                          clarification: "Heathrow: bizav parking max 4 hours. Longer stays require written approval.",   costMin: null,  costMax: null,  costCurrency: "GBP", costType: null,              leadTimeDays: 0 },
    { icao: "EGLF",  type: "WARNING", category: "PARKING",     triggerJson: { alwaysActive: true },                          clarification: "Farnborough: 7-day max (4 days Airshow). Fee: £450/day over limit.",            costMin: 450,   costMax: 2000,  costCurrency: "GBP", costType: "PARKING_FEE",     leadTimeDays: 0 },
    { icao: "LFPB",  type: "WARNING", category: "PARKING",     triggerJson: { alwaysActive: true },                          clarification: "Le Bourget: limited overnight parking. Long-term: arrange at LFPG.",            costMin: null,  costMax: null,  costCurrency: "EUR", costType: null,              leadTimeDays: 0 },
    { icao: "ZBAA",  type: "WARNING", category: "PARKING",     triggerJson: { alwaysActive: true },                          clarification: "Beijing: GA parking extremely limited. Use ZSNJ (Nanjing) as alternate.",       costMin: null,  costMax: null,  costCurrency: "CNY", costType: null,              leadTimeDays: 3 },
    { icao: "VHHH",  type: "WARNING", category: "PARKING",     triggerJson: { alwaysActive: true },                          clarification: "Hong Kong: Very limited bizav parking. Consider Macau (VMMC) alternate.",       costMin: null,  costMax: null,  costCurrency: "HKD", costType: null,              leadTimeDays: 2 },
    // COST — revenue flight trigger
    { icao: "KTEB",  type: "WARNING", category: "COST",        triggerJson: { flightType: "REVENUE" },                       clarification: "Revenue charter: additional NYC passenger facility charge applies.",             costMin: 200,   costMax: 800,   costCurrency: "USD", costType: "PASSENGER_CHARGE", leadTimeDays: 0 },
    { icao: "KJFK",  type: "WARNING", category: "COST",        triggerJson: { flightType: "REVENUE" },                       clarification: "JFK: Charter ops require TSA approval. Revenue flights: PANYNJ landing premium.", costMin: 500,  costMax: 2000,  costCurrency: "USD", costType: "LANDING_FEE",     leadTimeDays: 0 },
    { icao: "EGLL",  type: "WARNING", category: "COST",        triggerJson: { flightType: "REVENUE" },                       clarification: "Heathrow: Revenue charter attracts higher ATC charges. APD per pax applies.",   costMin: 2000,  costMax: 8000,  costCurrency: "GBP", costType: "APD",             leadTimeDays: 0 },
    { icao: "LSZH",  type: "WARNING", category: "COST",        triggerJson: { flightType: "REVENUE" },                       clarification: "Zurich: Swiss APD CHF 72 per pax on revenue international departures.",         costMin: 500,   costMax: 3000,  costCurrency: "CHF", costType: "APD",             leadTimeDays: 0 },
    { icao: "OMDB",  type: "WARNING", category: "COST",        triggerJson: { flightType: "REVENUE" },                       clarification: "Dubai: Revenue charter requires GCAA charter license. Extra charges apply.",     costMin: 500,   costMax: 2000,  costCurrency: "USD", costType: "CHARTER_FEE",     leadTimeDays: 2 },
    { icao: "EHAM",  type: "WARNING", category: "COST",        triggerJson: { flightType: "REVENUE" },                       clarification: "Amsterdam: Revenue ops attract Dutch APD. Handling surcharge for charter.",     costMin: 800,   costMax: 3000,  costCurrency: "EUR", costType: "APD",             leadTimeDays: 0 },
    { icao: "LFPB",  type: "WARNING", category: "COST",        triggerJson: { flightType: "REVENUE" },                       clarification: "Le Bourget: Revenue charter requires DGAC auth. French APD per pax.",           costMin: 600,   costMax: 2500,  costCurrency: "EUR", costType: "APD",             leadTimeDays: 2 },
    { icao: "VHHH",  type: "WARNING", category: "COST",        triggerJson: { flightType: "REVENUE" },                       clarification: "Hong Kong: Revenue charter needs HKCA license. Passenger levy HKD 120/pax.",   costMin: 400,   costMax: 2000,  costCurrency: "HKD", costType: "PASSENGER_LEVY",  leadTimeDays: 1 },
    { icao: "WSSS",  type: "WARNING", category: "COST",        triggerJson: { flightType: "REVENUE" },                       clarification: "Singapore: CAAS charter license required. Pax service charge applies.",         costMin: 300,   costMax: 1500,  costCurrency: "SGD", costType: "SERVICE_CHARGE",  leadTimeDays: 2 },
    // PPR — alwaysActive
    { icao: "KBED",  type: "INFO",    category: "PPR",         triggerJson: { alwaysActive: true },                          clarification: "Hanscom Field: PPR required for all ops. Contact base ops 1h min before.",     costMin: null,  costMax: null,  costCurrency: "USD", costType: null,              leadTimeDays: 0 },
    { icao: "KAPA",  type: "INFO",    category: "PPR",         triggerJson: { alwaysActive: true },                          clarification: "Centennial: PPR via APA base ops. Weekends particularly busy — call ahead.",    costMin: null,  costMax: null,  costCurrency: "USD", costType: null,              leadTimeDays: 0 },
    { icao: "KSDL",  type: "INFO",    category: "PPR",         triggerJson: { alwaysActive: true },                          clarification: "Scottsdale: PPR required. Limited transient parking. Confirm with FBO.",        costMin: null,  costMax: null,  costCurrency: "USD", costType: null,              leadTimeDays: 0 },
    // CUSTOMS — international trigger
    { icao: "KJFK",  type: "INFO",    category: "CUSTOMS",     triggerJson: { international: true },                         clarification: "JFK: CBP eAPIS filing required 1h before arrival for all international ops.",   costMin: null,  costMax: null,  costCurrency: "USD", costType: null,              leadTimeDays: 0 },
    { icao: "KMIA",  type: "INFO",    category: "CUSTOMS",     triggerJson: { international: true },                         clarification: "Miami: CBP pre-clearance via eAPIS. Customs at Signature FBO Terminal H.",      costMin: null,  costMax: null,  costCurrency: "USD", costType: null,              leadTimeDays: 0 },
    { icao: "PANC",  type: "INFO",    category: "CUSTOMS",     triggerJson: { international: true },                         clarification: "Anchorage: Excellent customs facility — popular trans-Pacific stop. 24/7.",      costMin: null,  costMax: null,  costCurrency: "USD", costType: null,              leadTimeDays: 0 },
    { icao: "FAOR",  type: "WARNING", category: "CUSTOMS",     triggerJson: { international: true },                         clarification: "Johannesburg: SAPS customs inspection. Allow 90min for processing.",            costMin: null,  costMax: null,  costCurrency: "USD", costType: null,              leadTimeDays: 0 },
    { icao: "HECA",  type: "WARNING", category: "CUSTOMS",     triggerJson: { international: true },                         clarification: "Cairo: Egyptian customs can be slow. Allow 2-3h. Handler expedite recommended.", costMin: 200,  costMax: 800,   costCurrency: "USD", costType: "EXPEDITE_FEE",    leadTimeDays: 0 },
    // OPERATIONAL — alwaysActive
    { icao: "KVNY",  type: "INFO",    category: "OPERATIONAL", triggerJson: { alwaysActive: true },                          clarification: "Van Nuys: IFR departures subject to RNAV SID altitude restrictions. Check NOTAMs.", costMin: null, costMax: null, costCurrency: "USD", costType: null,              leadTimeDays: 0 },
    { icao: "KLAS",  type: "INFO",    category: "OPERATIONAL", triggerJson: { alwaysActive: true },                          clarification: "Las Vegas: Heavy traffic weekends and conventions. Expect ATC ground delays.",   costMin: null,  costMax: null,  costCurrency: "USD", costType: null,              leadTimeDays: 0 },
    { icao: "OMAA",  type: "INFO",    category: "OPERATIONAL", triggerJson: { alwaysActive: true },                          clarification: "Abu Dhabi: Presidential movement restrictions can close airspace with little notice.", costMin: null, costMax: null, costCurrency: "USD", costType: null,              leadTimeDays: 0 },
    { icao: "OOMS",  type: "INFO",    category: "OPERATIONAL", triggerJson: { alwaysActive: true },                          clarification: "Muscat: Sand and dust advisories common. Check METARs. Crosswind on 26L/08R.",  costMin: null,  costMax: null,  costCurrency: "USD", costType: null,              leadTimeDays: 0 },
    { icao: "DNMM",  type: "WARNING", category: "OPERATIONAL", triggerJson: { alwaysActive: true },                          clarification: "Lagos: ILS often unserviceable. STAR procedures may differ from published.",     costMin: null,  costMax: null,  costCurrency: "USD", costType: null,              leadTimeDays: 0 },
    { icao: "VTBS",  type: "INFO",    category: "OPERATIONAL", triggerJson: { alwaysActive: true },                          clarification: "Bangkok Suvarnabhumi: Bizav via Dom terminal apron. Confirm handler for GA.",   costMin: null,  costMax: null,  costCurrency: "THB", costType: null,              leadTimeDays: 0 },
  ];

  let warningCount = 0;
  for (const w of warningData) {
    const airportId = await getAirportId(w.icao);
    if (!airportId) {
      console.warn(`⚠️  Airport ${w.icao} not found — skipping warning`);
      continue;
    }

    await prisma.airportWarning.create({
      data: {
        airportId,
        type: w.type,
        category: w.category as any,
        triggerJson: w.triggerJson ?? undefined,
        clarification: w.clarification,
        costMin: w.costMin,
        costMax: w.costMax,
        costCurrency: w.costCurrency,
        costType: w.costType,
        leadTimeDays: w.leadTimeDays,
        verifiedDate: new Date("2025-01-15"),
        status: "ACTIVE",
        sourceId: mockSource.id,
      },
    });
    warningCount++;
  }

  console.log(`✅ ${warningCount} airport warnings created`);
  console.log("\n🎉 Phase 2 complete!\n");
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  await seedAirports();
  await seedFuelAndWarnings();
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
