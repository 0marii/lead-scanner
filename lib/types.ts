export interface Lead {
  id: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  rating: string;
  reviewCount: number | null;
  lat: number;
  lng: number;
  mapsUrl: string;
  category: string;
  source: "overpass" | "mock" | "google";
}

export type ScanMode = "radius" | "multi" | "state";

export interface ScanZone {
  lat: number;
  lng: number;
  radiusMiles: number;
}

export interface ScanRequest {
  category: string;
  mode: ScanMode;
  radiusMiles?: number;
  center?: { lat: number; lng: number };
  zones?: ScanZone[];
  stateCode?: string;
}

export interface ScanProgress {
  current: number;
  total: number;
  message: string;
}

export interface ScanResponse {
  leads: Lead[];
  scanned: number;
  skipped: number;
  provider: string;
  progress?: ScanProgress;
}

export interface ExportFormat {
  format: "csv" | "json" | "xlsx";
  leads: Lead[];
}
