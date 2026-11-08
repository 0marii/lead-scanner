import { getStateByCode } from "@/lib/states";
import type { Lead, ScanRequest } from "@/lib/types";

export class InputError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError("Expected an object");
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 200): string {
  if (typeof value !== "string" || value.length > max) throw new InputError("Invalid text field");
  return value.trim();
}
function number(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new InputError("Number outside allowed range");
  return value;
}
function point(value: unknown) {
  const p = record(value);
  return { lat: number(p.lat, -85, 85), lng: number(p.lng, -180, 180) };
}
export function validateScan(value: unknown): ScanRequest & { useMock: boolean } {
  const body = record(value);
  const category = text(body.category, 80);
  if (!category || /[\x00-\x1f]/.test(category)) throw new InputError("Enter a category of 1–80 characters");
  if (body.useMock !== undefined && typeof body.useMock !== "boolean") throw new InputError("Invalid demo setting");
  const common = { category, useMock: body.useMock === true };
  switch (body.mode) {
    case "radius": return { ...common, mode: "radius", center: point(body.center), radiusMiles: number(body.radiusMiles, 1, 50) };
    case "multi": {
      if (!Array.isArray(body.zones) || body.zones.length < 1 || body.zones.length > 5) throw new InputError("Choose between 1 and 5 zones");
      return { ...common, mode: "multi", zones: body.zones.map(value => { const z = record(value); return { ...point(z), radiusMiles: number(z.radiusMiles, 1, 50) }; }) };
    }
    case "state": {
      const stateCode = text(body.stateCode, 2).toUpperCase();
      if (!getStateByCode(stateCode)) throw new InputError("Choose a valid US state");
      return { ...common, mode: "state", stateCode };
    }
    default: throw new InputError("Invalid scan mode");
  }
}
export function validateExport(value: unknown): { format: "csv" | "json" | "xlsx"; leads: Lead[] } {
  const body = record(value);
  if (body.format !== "csv" && body.format !== "json" && body.format !== "xlsx") throw new InputError("Invalid export format");
  if (!Array.isArray(body.leads) || body.leads.length < 1 || body.leads.length > 500) throw new InputError("Export between 1 and 500 leads");
  const leads = body.leads.map(value => {
    const lead = record(value);
    if (!["overpass", "google", "mock"].includes(String(lead.source))) throw new InputError("Invalid source");
    const mapsUrl = text(lead.mapsUrl, 2000);
    let url: URL;
    try { url = new URL(mapsUrl); } catch { throw new InputError("Invalid map URL"); }
    if (url.protocol !== "https:") throw new InputError("Map URLs must use HTTPS");
    return {
      id: text(lead.id), name: text(lead.name, 500), phone: text(lead.phone), city: text(lead.city, 500),
      address: text(lead.address, 2000), rating: text(lead.rating), category: text(lead.category, 80),
      reviewCount: lead.reviewCount === null ? null : number(lead.reviewCount, 0, 1e9),
      ...point(lead), mapsUrl, source: lead.source as Lead["source"],
    };
  });
  return { format: body.format, leads };
}
