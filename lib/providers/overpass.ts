import { buildCacheKey, getCached, setCached } from "@/lib/cache";
import { buildOverpassTagFilters, matchesCategory } from "@/lib/categories";
import { milesToMeters } from "@/lib/geo";
import { getStateByCode } from "@/lib/states";
import type { Lead, ScanRequest } from "@/lib/types";
import type { ProviderResult, ScanProvider } from "@/lib/providers/types";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const MAX_RESULTS = 500;

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

function hasPhone(tags: Record<string, string>): boolean {
  return Boolean(tags.phone || tags["contact:phone"]);
}

function hasWebsite(tags: Record<string, string>): boolean {
  return Boolean(
    tags.website ||
      tags["contact:website"] ||
      tags.url ||
      tags["contact:facebook"] ||
      tags["contact:instagram"],
  );
}

function getPhone(tags: Record<string, string>): string {
  return tags.phone || tags["contact:phone"] || "";
}

function getName(tags: Record<string, string>): string {
  return tags.name || tags.brand || tags.operator || "Unknown Business";
}

function getAddress(tags: Record<string, string>): string {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:city"],
    tags["addr:state"],
    tags["addr:postcode"],
  ].filter(Boolean);

  if (parts.length > 0) return parts.join(" ");
  return tags["addr:full"] || "";
}

function getCity(tags: Record<string, string>): string {
  return tags["addr:city"] || tags["addr:town"] || tags["addr:village"] || "";
}

function elementToLead(element: OverpassElement, category: string): Lead | null {
  const tags = element.tags || {};
  if (!hasPhone(tags) || hasWebsite(tags)) return null;
  if (!matchesCategory(tags, category)) return null;

  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  if (lat === undefined || lng === undefined) return null;

  const id = `${element.type}/${element.id}`;
  const mapsUrl = `https://www.openstreetmap.org/${element.type}/${element.id}`;

  return {
    id,
    name: getName(tags),
    phone: getPhone(tags),
    city: getCity(tags),
    address: getAddress(tags),
    rating: "N/A",
    reviewCount: null,
    lat,
    lng,
    mapsUrl,
    category,
    source: "overpass",
  };
}

function buildAreaQuery(stateName: string, category: string): string {
  const tagFilters = buildOverpassTagFilters(category);
  const filterBlock = tagFilters
    .map(
      (filter) => `
  node${filter}["phone"](area.searchArea);
  node${filter}["contact:phone"](area.searchArea);
  way${filter}["phone"](area.searchArea);
  way${filter}["contact:phone"](area.searchArea);`,
    )
    .join("\n");

  return `
[out:json][timeout:15];
area["name"="${stateName}"]["admin_level"="4"]->.searchArea;
(
${filterBlock}
);
out center tags ${MAX_RESULTS};
`.trim();
}

function buildRadiusQuery(
  lat: number,
  lng: number,
  radiusMiles: number,
  category: string,
): string {
  const radiusMeters = Math.round(milesToMeters(radiusMiles));
  const tagFilters = buildOverpassTagFilters(category);
  const filterBlock = tagFilters
    .map(
      (filter) => `
  node${filter}["phone"](around:${radiusMeters},${lat},${lng});
  node${filter}["contact:phone"](around:${radiusMeters},${lat},${lng});
  way${filter}["phone"](around:${radiusMeters},${lat},${lng});
  way${filter}["contact:phone"](around:${radiusMeters},${lat},${lng});`,
    )
    .join("\n");

  return `
[out:json][timeout:15];
(
${filterBlock}
);
out center tags ${MAX_RESULTS};
`.trim();
}

async function fetchOverpass(query: string, signal?: AbortSignal): Promise<OverpassResponse> {
  let lastError: Error | null = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    signal?.throwIfAborted();
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(18_000)]),
      });

      if (!response.ok) {
        throw new Error(`Overpass error ${response.status}`);
      }

      return (await response.json()) as OverpassResponse;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Overpass request failed");
    }
  }

  throw lastError ?? new Error("Overpass request failed");
}

function parseElements(
  elements: OverpassElement[],
  category: string,
): { leads: Lead[]; scanned: number; skipped: number } {
  const leads: Lead[] = [];
  let skipped = 0;

  for (const element of elements) {
    const lead = elementToLead(element, category);
    if (lead) {
      leads.push(lead);
    } else {
      skipped += 1;
    }
  }

  const unique = new Map<string, Lead>();
  for (const lead of leads) {
    const key = lead.phone.replace(/\D/g, "") || lead.id;
    if (!unique.has(key)) unique.set(key, lead);
  }

  return {
    leads: Array.from(unique.values()).slice(0, MAX_RESULTS),
    scanned: elements.length,
    skipped,
  };
}

export class OverpassProvider implements ScanProvider {
  name = "overpass";

  async scan(request: ScanRequest, signal?: AbortSignal): Promise<ProviderResult> {
    const category = request.category.trim();
    if (!category) {
      return { leads: [], scanned: 0, skipped: 0 };
    }

    if (request.mode === "state" && request.stateCode) {
      return this.scanState(category, request.stateCode, signal);
    }

    if (request.mode === "multi" && request.zones?.length) {
      const allLeads: Lead[] = [];
      let scanned = 0;
      let skipped = 0;

      for (const zone of request.zones) {
        const result = await this.scanRadius(category, zone.lat, zone.lng, zone.radiusMiles, signal);
        allLeads.push(...result.leads);
        scanned += result.scanned;
        skipped += result.skipped;
      }

      const unique = new Map<string, Lead>();
      for (const lead of allLeads) {
        const key = lead.phone.replace(/\D/g, "") || lead.id;
        if (!unique.has(key)) unique.set(key, lead);
      }

      return {
        leads: Array.from(unique.values()).slice(0, MAX_RESULTS),
        scanned,
        skipped,
      };
    }

    if (request.center && request.radiusMiles) {
      return this.scanRadius(
        category,
        request.center.lat,
        request.center.lng,
        request.radiusMiles,
        signal,
      );
    }

    return { leads: [], scanned: 0, skipped: 0 };
  }

  private async scanState(category: string, stateCode: string, signal?: AbortSignal): Promise<ProviderResult> {
    const state = getStateByCode(stateCode);
    if (!state) return { leads: [], scanned: 0, skipped: 0 };

    const cacheKey = buildCacheKey({
      provider: "overpass",
      mode: "state",
      state: state.code,
      category,
    });

    const cached = getCached<ProviderResult>(cacheKey);
    if (cached) return cached;

    const query = buildAreaQuery(state.name, category);
    const response = await fetchOverpass(query, signal);
    const result = parseElements(response.elements, category);

    setCached(cacheKey, result, 10 * 60 * 1000);
    return result;
  }

  private async scanRadius(
    category: string,
    lat: number,
    lng: number,
    radiusMiles: number,
    signal?: AbortSignal,
  ): Promise<ProviderResult> {
    const cacheKey = buildCacheKey({
      provider: "overpass",
      mode: "radius",
      lat: lat.toFixed(4),
      lng: lng.toFixed(4),
      radius: radiusMiles,
      category,
    });

    const cached = getCached<ProviderResult>(cacheKey);
    if (cached) return cached;

    const query = buildRadiusQuery(lat, lng, radiusMiles, category);
    const response = await fetchOverpass(query, signal);
    const result = parseElements(response.elements, category);

    setCached(cacheKey, result, 5 * 60 * 1000);
    return result;
  }
}

export const overpassProvider = new OverpassProvider();
