import { NextResponse } from "next/server";
import { getScanProvider } from "@/lib/providers";
import { validateScan, InputError } from "@/lib/validation";
import { guard, readJson, apiError } from "@/lib/api";

export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    guard(request, "scan", 10);
    const body = validateScan(await readJson(request, 8192));
    const provider = getScanProvider(body.useMock);
    if (provider.name === "google" && body.mode === "state") throw new InputError("Google supports radius and multi-zone scans only");
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(45_000)]);
    const result = await provider.scan(body, signal);
    return NextResponse.json({ ...result, provider: provider.name }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
