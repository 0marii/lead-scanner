import { createGoogleProvider } from "@/lib/providers/googlePlaces";
import { mockProvider } from "@/lib/providers/mock";
import { overpassProvider } from "@/lib/providers/overpass";
import type { ScanProvider } from "@/lib/providers/types";

export function getScanProvider(forceMock = false): ScanProvider {
  if (forceMock || process.env.DATA_PROVIDER === "mock") {
    return mockProvider;
  }

  if (process.env.DATA_PROVIDER === "google" && process.env.ENABLE_PAID_PROVIDER !== "true") {
    throw new Error("Paid provider is disabled");
  }
  const googleProvider = createGoogleProvider();
  if (process.env.DATA_PROVIDER === "google" && !googleProvider) throw new Error("Google API key is missing");
  if (googleProvider && process.env.DATA_PROVIDER === "google") {
    return googleProvider;
  }

  return overpassProvider;
}

export { mockProvider, overpassProvider };
