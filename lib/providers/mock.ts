import type { Feature, Geometry } from "geojson";
import { generateGridPoints, getGeometryCoordinates, pointInPolygon } from "@/lib/geo";
import { getStateByCode } from "@/lib/states";
import type { Lead, ScanRequest } from "@/lib/types";
import type { ProviderResult, ScanProvider } from "@/lib/providers/types";
import statesGeoJson from "@/data/us-states.json";

const BUSINESS_PREFIXES = [
  "ABC",
  "FastFix",
  "Pro",
  "Central",
  "QuickFlow",
  "Metro",
  "Elite",
  "Prime",
  "Summit",
  "Golden",
  "BlueSky",
  "AllStar",
];

const BUSINESS_SUFFIXES = [
  "Co.",
  "Services",
  "LLC",
  "Group",
  "Pros",
  "Experts",
  "Solutions",
  "Works",
];

const STATE_CITIES: Record<string, string[]> = {
  TX: ["Houston", "Dallas", "Austin", "San Antonio", "Fort Worth"],
  CA: ["Los Angeles", "San Diego", "San Jose", "San Francisco", "Sacramento"],
  NY: ["New York", "Buffalo", "Rochester", "Albany", "Syracuse"],
  FL: ["Miami", "Orlando", "Tampa", "Jacksonville", "Tallahassee"],
  IL: ["Chicago", "Springfield", "Peoria", "Naperville", "Rockford"],
};

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatPhone(random: () => number): string {
  // NANP 555-0100–0199 is reserved for fictional use.
  return `(202) 555-01${String(Math.floor(random() * 100)).padStart(2, "0")}`;
}

function generateLead(
  category: string,
  lat: number,
  lng: number,
  index: number,
  city: string,
): Lead {
  const seed = hashString(`${category}-${lat}-${lng}-${index}`);
  const random = seededRandom(seed);
  const prefix = BUSINESS_PREFIXES[Math.floor(random() * BUSINESS_PREFIXES.length)];
  const suffix = BUSINESS_SUFFIXES[Math.floor(random() * BUSINESS_SUFFIXES.length)];
  const name = `${prefix} ${capitalize(category)} ${suffix}`;
  const phone = formatPhone(random);
  const rating = (3 + random() * 2).toFixed(1);
  const reviewCount = Math.floor(random() * 120);

  return {
    id: `mock-${seed}`,
    name,
    phone,
    city,
    address: `${100 + Math.floor(random() * 9000)} Main St, ${city}`,
    rating,
    reviewCount,
    lat: lat + (random() - 0.5) * 0.02,
    lng: lng + (random() - 0.5) * 0.02,
    mapsUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`,
    category,
    source: "mock",
  };
}

function getStateFeature(stateCode: string): Feature | undefined {
  const state = getStateByCode(stateCode);
  if (!state) return undefined;

  return (statesGeoJson as { features: Feature[] }).features.find(
    (feature) => feature.id === state.fips || feature.properties?.name === state.name,
  );
}

function generateForArea(
  category: string,
  points: { lat: number; lng: number }[],
  countPerPoint: number,
  cityFallback: string,
): Lead[] {
  const leads: Lead[] = [];

  points.forEach((point, pointIndex) => {
    const count = Math.max(1, Math.floor(countPerPoint * (0.7 + (pointIndex % 3) * 0.15)));
    for (let i = 0; i < count; i += 1) {
      leads.push(generateLead(category, point.lat, point.lng, i, cityFallback));
    }
  });

  return leads;
}

export class MockProvider implements ScanProvider {
  name = "mock";

  async scan(request: ScanRequest): Promise<ProviderResult> {
    const category = request.category.trim();
    if (!category) return { leads: [], scanned: 0, skipped: 0 };

    if (request.mode === "state" && request.stateCode) {
      const feature = getStateFeature(request.stateCode);
      if (!feature?.geometry) return { leads: [], scanned: 0, skipped: 0 };

      const state = getStateByCode(request.stateCode)!;
      const cities = STATE_CITIES[state.code] || [state.name];
      const bbox = getFeatureBBox(feature.geometry);
      const points = generateGridPoints(
        bbox,
        35,
        (point) =>
          pointInPolygon(point, getGeometryCoordinates(feature.geometry)),
      ).slice(0, 40);

      const leads = generateForArea(category, points, 2, cities[0]);
      return {
        leads,
        scanned: points.length * 3,
        skipped: Math.floor(points.length * 1.2),
      };
    }

    if (request.mode === "multi" && request.zones?.length) {
      const allLeads: Lead[] = [];
      let scanned = 0;

      for (const zone of request.zones) {
        const count = Math.max(3, Math.floor(zone.radiusMiles));
        for (let i = 0; i < count; i += 1) {
          allLeads.push(generateLead(category, zone.lat, zone.lng, i, "Local Area"));
        }
        scanned += count + 2;
      }

      const unique = Array.from(new Map(allLeads.map(lead => [lead.id, lead])).values());
      return {
        leads: unique,
        scanned,
        skipped: scanned - unique.length,
      };
    }

    if (request.center && request.radiusMiles) {
      const count = Math.max(5, Math.floor(request.radiusMiles * 1.5));
      const leads = Array.from({ length: count }, (_, index) =>
        generateLead(category, request.center!.lat, request.center!.lng, index, "Local Area"),
      );

      return {
        leads,
        scanned: count + 4,
        skipped: Math.floor(count * 0.4),
      };
    }

    return { leads: [], scanned: 0, skipped: 0 };
  }
}

function getFeatureBBox(geometry: Geometry): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  const coords: number[][] = [];

  const collect = (input: unknown): void => {
    if (!Array.isArray(input)) return;
    if (typeof input[0] === "number") {
      coords.push(input as number[]);
      return;
    }
    input.forEach(collect);
  };

  collect("coordinates" in geometry ? geometry.coordinates : undefined);
  const lats = coords.map((c) => c[1]);
  const lngs = coords.map((c) => c[0]);

  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

export const mockProvider = new MockProvider();
