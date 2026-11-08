export interface LatLng {
  lat: number;
  lng: number;
}

export interface BBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

const EARTH_RADIUS_MILES = 3958.8;

export function milesToMeters(miles: number): number {
  return miles * 1609.34;
}

export function haversineMiles(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

export function bboxFromCenter(center: LatLng, radiusMiles: number): BBox {
  const latDelta = radiusMiles / 69;
  const lngDelta = radiusMiles / (69 * Math.cos((center.lat * Math.PI) / 180));

  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}

export function pointInRing(point: LatLng, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][1];
    const yi = ring[i][0];
    const xj = ring[j][1];
    const yj = ring[j][0];

    const intersect =
      yi > point.lng !== yj > point.lng &&
      point.lat < ((xj - xi) * (point.lng - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}

export function pointInPolygon(point: LatLng, coordinates: number[][][] | number[][][][]): boolean {
  if (coordinates.length === 0) return false;

  if (Array.isArray(coordinates[0][0][0])) {
    const multi = coordinates as number[][][][];
    return multi.some((polygon) => pointInPolygon(point, polygon));
  }

  const polygon = coordinates as number[][][];
  const outer = polygon[0];
  if (!outer || !pointInRing(point, outer)) return false;

  for (let i = 1; i < polygon.length; i += 1) {
    if (pointInRing(point, polygon[i])) return false;
  }

  return true;
}

export function bboxFromGeoJsonGeometry(geometry: { coordinates?: unknown }): BBox {
  const points: LatLng[] = [];

  const collect = (coords: unknown): void => {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      points.push({ lat: coords[1] as number, lng: coords[0] as number });
      return;
    }
    coords.forEach(collect);
  };

  collect(geometry.coordinates);

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);

  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

export function generateGridPoints(
  bbox: BBox,
  spacingMiles: number,
  isInside?: (point: LatLng) => boolean,
): LatLng[] {
  const latStep = spacingMiles / 69;
  const points: LatLng[] = [];

  for (let lat = bbox.minLat; lat <= bbox.maxLat; lat += latStep) {
    const lngStep = spacingMiles / (69 * Math.cos((lat * Math.PI) / 180));
    for (let lng = bbox.minLng; lng <= bbox.maxLng; lng += lngStep) {
      const point = { lat, lng };
      if (!isInside || isInside(point)) points.push(point);
    }
  }

  return points;
}

export function getGeometryCoordinates(
  geometry: unknown,
): number[][][] | number[][][][] {
  if (!geometry || typeof geometry !== "object") return [];

  const value = geometry as { type?: string; coordinates?: unknown; geometries?: unknown[] };

  if (value.type === "GeometryCollection" && Array.isArray(value.geometries)) {
    for (const item of value.geometries) {
      const coords = getGeometryCoordinates(item);
      if (coords.length > 0) return coords;
    }
    return [];
  }

  return (value.coordinates ?? []) as number[][][] | number[][][][];
}

export function dedupeLeads<T extends { id: string; phone: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const key = item.id || item.phone.replace(/\D/g, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}
