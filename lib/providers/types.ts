import type { Lead, ScanRequest } from "@/lib/types";

export interface ProviderResult {
  leads: Lead[];
  scanned: number;
  skipped: number;
}

export interface ScanProvider {
  name: string;
  scan(request: ScanRequest, signal?: AbortSignal): Promise<ProviderResult>;
}
