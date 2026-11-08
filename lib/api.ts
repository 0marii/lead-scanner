import { NextResponse } from "next/server";
import { InputError } from "@/lib/validation";

// Per-process backstop. Configure a shared edge rate limit for multi-instance deployments.
const buckets = new Map<string, { count: number; expires: number }>();
export function rateLimit(key: string, limit: number, now = Date.now()): boolean {
  for (const [id, bucket] of buckets) if (bucket.expires <= now) buckets.delete(id);
  const bucket = buckets.get(key);
  if (bucket) { bucket.count += 1; return bucket.count <= limit; }
  if (buckets.size >= 5000) return false;
  buckets.set(key, { count: 1, expires: now + 60_000 });
  return true;
}
export function guard(request: Request, kind: string, limit: number) {
  const origin = request.headers.get("origin");
  // Next.js can normalize request.url to an internal hostname behind a proxy.
  // Compare the browser origin with the received Host, never arbitrary X-Forwarded-Host.
  if (origin) {
    let originHost: string;
    try { originHost = new URL(origin).host; } catch { throw new InputError("Invalid origin", 403); }
    const host = request.headers.get("host") ?? new URL(request.url).host;
    if (originHost !== host) throw new InputError("Cross-origin requests are not allowed", 403);
  }
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new InputError("Cross-site requests are not allowed", 403);
  // Do not trust arbitrary forwarding headers: use a conservative process-wide budget.
  if (!rateLimit(kind, limit)) throw new InputError("Too many requests. Retry in a minute.", 429);
}
export async function readJson(request: Request, maxBytes: number): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new InputError("Use application/json", 415);
  if (Number(request.headers.get("content-length")) > maxBytes) throw new InputError("Request too large", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new InputError("Missing request body");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new InputError("Request too large", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new InputError("Invalid JSON"); }
}
export function apiError(error: unknown) {
  if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: error.status, headers: error.status === 429 ? { "Retry-After": "60" } : undefined });
  console.error("API request failed", error);
  return NextResponse.json({ error: "Service unavailable. Please retry or select demo mode." }, { status: 503 });
}
