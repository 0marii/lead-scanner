import { milesToMeters } from "@/lib/geo";
import type { Lead, ScanRequest } from "@/lib/types";
import type { ProviderResult, ScanProvider } from "@/lib/providers/types";

interface GooglePlaceResult {
  place_id: string;
  name: string;
  geometry?: { location?: { lat: number; lng: number } };
  vicinity?: string;
  rating?: number;
  user_ratings_total?: number;
}

interface GooglePlaceDetails {
  status?: string;
  result?: {
    formatted_phone_number?: string;
    website?: string;
    url?: string;
    name?: string;
    formatted_address?: string;
    rating?: number;
    user_ratings_total?: number;
    geometry?: { location?: { lat: number; lng: number } };
  };
}


async function nearbySearch(
  apiKey: string,
  lat: number,
  lng: number,
  radiusMiles: number,
  keyword: string,
  signal?: AbortSignal,
): Promise<GooglePlaceResult[]> {
  const radiusMeters = Math.min(milesToMeters(radiusMiles), 50000);
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", String(Math.round(radiusMeters)));
  url.searchParams.set("keyword", keyword);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), { signal: AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(10_000)]) });
  if (!response.ok) throw new Error(`Google Nearby Search failed: ${response.status}`);

  const data = (await response.json()) as { results?: GooglePlaceResult[]; status?: string };
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") throw new Error("Google search unavailable");
  return data.results ?? [];
}

async function placeDetails(apiKey: string, placeId: string, signal?: AbortSignal): Promise<GooglePlaceDetails["result"]> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set(
    "fields",
    "name,formatted_phone_number,website,formatted_address,rating,user_ratings_total,geometry,url",
  );
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), { signal: AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(10_000)]) });
  if (!response.ok) throw new Error(`Google Place Details failed: ${response.status}`);

  const data = (await response.json()) as GooglePlaceDetails;
  if (data.status !== "OK") throw new Error("Google details unavailable");
  return data.result;
}

export class GooglePlacesProvider implements ScanProvider {
  name = "google";

  constructor(private apiKey: string) {}

  async scan(request: ScanRequest, signal?: AbortSignal): Promise<ProviderResult> {
    const category = request.category.trim();
    if (!category) return { leads: [], scanned: 0, skipped: 0 };

    if (request.mode === "state" && request.stateCode) {
      throw new Error("Google state scans are disabled");
    }

    if (request.mode === "multi" && request.zones?.length) {
      const allLeads: Lead[] = [];
      let scanned = 0;
      let skipped = 0;

      for (const zone of request.zones) {
        const result = await this.scanPoint(category, zone.lat, zone.lng, zone.radiusMiles, signal);
        allLeads.push(...result.leads);
        scanned += result.scanned;
        skipped += result.skipped;
      }

      return this.dedupe(allLeads, scanned, skipped);
    }

    if (request.center && request.radiusMiles) {
      return this.scanPoint(
        category,
        request.center.lat,
        request.center.lng,
        request.radiusMiles,
        signal,
      );
    }

    return { leads: [], scanned: 0, skipped: 0 };
  }

  private async scanPoint(
    category: string,
    lat: number,
    lng: number,
    radiusMiles: number,
    signal?: AbortSignal,
  ): Promise<ProviderResult> {
    const results = await nearbySearch(this.apiKey, lat, lng, radiusMiles, category, signal);
    const leads: Lead[] = [];
    let skipped = 0;

    for (const place of results.slice(0, 20)) {
      if (!place.place_id) {
        skipped += 1;
        continue;
      }

      const details = await placeDetails(this.apiKey, place.place_id, signal);
      if (!details?.formatted_phone_number || details.website) {
        skipped += 1;
        continue;
      }

      const placeLat = details.geometry?.location?.lat ?? place.geometry?.location?.lat ?? lat;
      const placeLng = details.geometry?.location?.lng ?? place.geometry?.location?.lng ?? lng;

      leads.push({
        id: place.place_id,
        name: details.name ?? place.name,
        phone: details.formatted_phone_number,
        city: extractCity(details.formatted_address ?? place.vicinity ?? ""),
        address: details.formatted_address ?? place.vicinity ?? "",
        rating: details.rating ? String(details.rating) : "N/A",
        reviewCount: details.user_ratings_total ?? null,
        lat: placeLat,
        lng: placeLng,
        mapsUrl: details.url ?? `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
        category,
        source: "google",
      });
    }

    return { leads, scanned: results.length, skipped };
  }

  private dedupe(leads: Lead[], scanned: number, skipped: number): ProviderResult {
    const unique = new Map<string, Lead>();
    for (const lead of leads) {
      const key = lead.phone.replace(/\D/g, "") || lead.id;
      if (!unique.has(key)) unique.set(key, lead);
    }

    return {
      leads: Array.from(unique.values()),
      scanned,
      skipped,
    };
  }
}

function extractCity(address: string): string {
  const parts = address.split(",").map((part) => part.trim());
  if (parts.length >= 2) return parts[parts.length - 2];
  return "";
}

export function createGoogleProvider(): GooglePlacesProvider | null {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;
  return new GooglePlacesProvider(apiKey);
}
