import * as turf from "@turf/turf";
import type { Feature, Polygon } from "geojson";

/**
 * Build a GeoJSON polygon circle for the given origin + range.
 * Uses nauticalmiles as the unit so the radius maps directly to NM.
 */
export function buildRangeCircle(
  originLon: number,
  originLat: number,
  rangeNm: number
): Feature<Polygon> {
  return turf.circle([originLon, originLat], rangeNm, {
    units: "nauticalmiles",
    steps: 64,
  }) as Feature<Polygon>;
}

/**
 * Return the IDs of airports whose coordinates fall within the range circle.
 */
export function airportsWithinRange(
  airports: Array<{ id: string; lon: number; lat: number }>,
  circle: Feature<Polygon>
): string[] {
  return airports
    .filter((a) =>
      turf.booleanPointInPolygon(turf.point([a.lon, a.lat]), circle)
    )
    .map((a) => a.id);
}

/**
 * Calculate distance in NM between two coordinates.
 */
export function distanceBetweenNm(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number
): number {
  return turf.distance([lon1, lat1], [lon2, lat2], { units: "nauticalmiles" });
}
