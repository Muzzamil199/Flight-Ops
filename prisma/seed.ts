import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  // Read the GeoJSON file from project root
  const filePath = path.join(__dirname, "..", "airports-75.geojson");
  const raw = fs.readFileSync(filePath, "utf-8");
  const geojson = JSON.parse(raw);

  console.log(`Found ${geojson.features.length} airports. Seeding...`);

  for (const feature of geojson.features) {
    const props = feature.properties;
    const [lon, lat] = feature.geometry.coordinates; // GeoJSON = [lon, lat]
    const ops = props.operations || {};

    // Upsert airport
    const airport = await prisma.airport.upsert({
      where: { icao: props.icao },
      update: {},
      create: {
        icao: props.icao,
        iata: props.iata || null,
        name: props.name,
        city: props.city || null,
        lat: lat,
        lon: lon,
        elevation: props.elevation || null,
        timezone: props.timezone,
        countryCode: props.countryCode,
        runwayLength: props.runwayLength || null,
        status: props.status || "active",
      },
    });

    // Upsert operations data
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

  console.log(`\nDone! Seeded ${geojson.features.length} airports.`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });