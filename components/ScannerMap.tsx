"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, GeoJSON, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { FeatureCollection, GeoJsonObject } from "geojson";
import "leaflet/dist/leaflet.css";
import type { Lead } from "@/lib/types";
import statesGeoJson from "@/data/us-states.json";
import { getStateByCode } from "@/lib/states";
import { milesToMeters } from "@/lib/geo";

const tileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export interface MapZone {
  id: string;
  lat: number;
  lng: number;
  radiusMiles: number;
}

interface ScannerMapProps {
  center: { lat: number; lng: number };
  onStateCenter: (center: { lat: number; lng: number }) => void;
  radiusMiles: number;
  zones: MapZone[];
  selectedStateCode?: string;
  leads: Lead[];
  selectedLeadId: string | null;
  onSelectLead: (id: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  multiMode: boolean;
}

function RecenterMap({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

function FitStateBounds({ stateCode, onStateCenter }: { stateCode?: string; onStateCenter: (center: { lat: number; lng: number }) => void }) {
  const map = useMap();

  useEffect(() => {
    if (!stateCode) return;
    const state = getStateByCode(stateCode);
    if (!state) return;

    const feature = (statesGeoJson as FeatureCollection).features.find(
      (item) => item.id === state.fips || item.properties?.name === state.name,
    );

    if (!feature) return;

    const layer = L.geoJSON(feature as GeoJsonObject);
    map.fitBounds(layer.getBounds(), { padding: [24, 24], animate: false });
    const center = map.getCenter();
    onStateCenter({ lat: center.lat, lng: center.lng });
  }, [stateCode, map, onStateCenter]);

  return null;
}

function leadPin(number: number, selected: boolean) {
  return L.divIcon({
    className: `lead-pin ${selected ? "lead-pin--selected" : ""}`,
    html: `<span>${number}</span>`,
    iconSize: [28, 34], iconAnchor: [14, 34], popupAnchor: [0, -32],
  });
}

function BusinessMarker({ lead, number, selected, onSelect }: { lead: Lead; number: number; selected: boolean; onSelect: (id: string) => void }) {
  const marker = useRef<L.Marker>(null);
  useEffect(() => { if (selected) marker.current?.openPopup(); }, [selected]);
  return <Marker ref={marker} position={[lead.lat, lead.lng]} icon={leadPin(number, selected)} title={lead.name} zIndexOffset={selected ? 1000 : 0} eventHandlers={{ click: () => onSelect(lead.id) }}>
    <Tooltip direction="top" offset={[0, -30]}>{lead.name}</Tooltip>
    <Popup className="business-popup" minWidth={200} maxWidth={260}>
      <div className="space-y-2">
        <p className="text-sm font-semibold">{lead.name}</p>
        <p className="text-xs leading-5 text-terminal-muted">{lead.address || lead.city || "Address unavailable"}</p>
        <p className="text-xs">{lead.phone}</p>
        {lead.source === "mock" && <p className="text-[10px] text-amber-200">Fictional demo business</p>}
        <a href={lead.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs">Open in maps ↗</a>
      </div>
    </Popup>
  </Marker>;
}

function LeadMarkers({ leads, selectedLeadId, onSelectLead }: { leads: Lead[]; selectedLeadId: string | null; onSelectLead: (id: string) => void }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const selected = leads.find(lead => lead.id === selectedLeadId);
  useEffect(() => {
    if (selected) map.setView([selected.lat, selected.lng], Math.max(map.getZoom(), 12), { animate: false });
  }, [selected, map]);

  // Group nearby markers in screen-space cells; zooming reveals individual businesses.
  const groups = new Map<string, { lead: Lead; number: number }[]>();
  leads.forEach((lead, index) => {
    const point = map.project([lead.lat, lead.lng], zoom);
    const key = lead.id === selectedLeadId ? `selected-${lead.id}` : `${Math.floor(point.x / 48)}:${Math.floor(point.y / 48)}`;
    const members = groups.get(key) ?? [];
    members.push({ lead, number: index + 1 });
    groups.set(key, members);
  });
  return <>{Array.from(groups.entries()).map(([key, members]) => {
    if (members.length === 1) {
      const { lead, number } = members[0];
      return <BusinessMarker key={lead.id} lead={lead} number={number} selected={lead.id === selectedLeadId} onSelect={onSelectLead} />;
    }
    const position: [number, number] = [members.reduce((sum, item) => sum + item.lead.lat, 0) / members.length, members.reduce((sum, item) => sum + item.lead.lng, 0) / members.length];
    return <Marker key={key} position={position} title={`${members.length} businesses — zoom in`} icon={L.divIcon({ className: "lead-cluster", html: `<span>${members.length}</span>`, iconSize: [38, 38], iconAnchor: [19, 19] })} eventHandlers={{ click: () => {
      const bounds = L.latLngBounds(members.map(({ lead }) => [lead.lat, lead.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: Math.min(19, zoom + 3), animate: false });
    } }}><Tooltip>{members.length} businesses · click to zoom in</Tooltip></Marker>;
  })}</>;
}

function ResizeMap() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function zoneIcon(number: number) {
  return L.divIcon({ className: "zone-pin", html: `<span>Z${number}</span>`, iconSize: [30, 24], iconAnchor: [15, 12] });
}

export default function ScannerMap({
  center,
  onStateCenter,
  radiusMiles,
  zones,
  selectedStateCode,
  leads,
  selectedLeadId,
  onSelectLead,
  onMapClick,
  multiMode,
}: ScannerMapProps) {
  const [tileError, setTileError] = useState(false);
  const [tileRevision, setTileRevision] = useState(0);
  const stateFeature = useMemo(() => {
    if (!selectedStateCode) return null;
    const state = getStateByCode(selectedStateCode);
    if (!state) return null;

    return (statesGeoJson as FeatureCollection).features.find(
      (item) => item.id === state.fips || item.properties?.name === state.name,
    );
  }, [selectedStateCode]);

  return (
    <div className="terminal-border isolate relative z-0 h-[420px] min-h-[320px] overflow-hidden rounded-xl lg:h-full">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={10}
        className="h-full w-full"
        style={{ minHeight: "320px", background: "#0a1210" }}
      >
        <TileLayer
          key={tileRevision}
          className="scanner-map-tiles"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={tileUrl}
          maxZoom={19}
          eventHandlers={{ tileerror: () => setTileError(true) }}
        />

        <ResizeMap />
        <RecenterMap center={center} />
        <FitStateBounds stateCode={selectedStateCode} onStateCenter={onStateCenter} />

        {stateFeature && (
          <GeoJSON
            key={selectedStateCode}
            data={stateFeature as GeoJsonObject}
            pathOptions={{
              color: "#00ff9c",
              weight: 2,
              fillColor: "#00ff9c",
              fillOpacity: 0.025,
            }}
          />
        )}

        {!multiMode && !selectedStateCode && (
          <Circle
            center={[center.lat, center.lng]}
            radius={milesToMeters(radiusMiles)}
            pathOptions={{
              color: "#00ff9c",
              fillColor: "#00ff9c",
              fillOpacity: 0.025,
              weight: 1,
            }}
          />
        )}

        {multiMode &&
          zones.map((zone) => (
            <Circle
              key={zone.id}
              center={[zone.lat, zone.lng]}
              radius={milesToMeters(zone.radiusMiles)}
              pathOptions={{
                color: "#ffd166",
                fillColor: "#ffd166",
                fillOpacity: 0.06,
                weight: 1,
              }}
            />
          ))}

        {multiMode &&
          zones.map((zone, index) => (
            <Marker key={`${zone.id}-marker`} position={[zone.lat, zone.lng]} icon={zoneIcon(index + 1)} title={`Zone ${index + 1}: ${zone.radiusMiles} miles`}>
              <Tooltip>Zone {index + 1} · {zone.radiusMiles} mi</Tooltip>
            </Marker>
          ))}

        <LeadMarkers leads={leads} selectedLeadId={selectedLeadId} onSelectLead={onSelectLead} />

        {onMapClick && (
          <MapClickHandler onMapClick={onMapClick} enabled={!selectedStateCode} />
        )}
      </MapContainer>
      {tileError && (
        <div role="alert" className="absolute left-3 right-3 top-20 z-[1000] rounded border border-terminal-border bg-[#050807]/95 p-3 text-xs text-foreground">
          Map tiles could not load. Check your connection. Scanning and exports remain available.
          <button type="button" className="ml-3 text-terminal underline" onClick={() => { setTileError(false); setTileRevision(value => value + 1); }}>Retry map</button>
        </div>
      )}
    </div>
  );
}

function MapClickHandler({
  onMapClick,
  enabled,
}: {
  onMapClick: (lat: number, lng: number) => void;
  enabled: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return undefined;

    const handler = (event: L.LeafletMouseEvent) => {
      onMapClick(event.latlng.lat, event.latlng.lng);
    };

    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [enabled, map, onMapClick]);

  return null;
}
