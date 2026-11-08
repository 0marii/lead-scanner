"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ResultsTable } from "@/components/ResultsTable";
import { ScanControls, type ScanMode } from "@/components/ScanControls";
import type { MapZone } from "@/components/ScannerMap";
import type { Lead } from "@/lib/types";

const ScannerMap = dynamic(() => import("@/components/ScannerMap"), {
  ssr: false,
  loading: () => (
    <div className="terminal-border flex h-[320px] items-center justify-center rounded bg-terminal-panel text-terminal-muted">
      Loading map...
    </div>
  ),
});

const DEFAULT_CENTER = { lat: 40.7128, lng: -74.006 };

function createZoneId() {
  return `zone-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function ScanPage() {
  const [category, setCategory] = useState("plumbers");
  const [radiusMiles, setRadiusMiles] = useState(10);
  const [scanMode, setScanMode] = useState<ScanMode>("radius");
  const [selectedStateCode, setSelectedStateCode] = useState("");
  const multiMode = scanMode === "multi";
  const [useMock, setUseMock] = useState(false);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [zones, setZones] = useState<MapZone[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem("lead-scanner-saved");
      if (!stored) return new Set();
      return new Set(JSON.parse(stored) as string[]);
    } catch {
      return new Set();
    }
  });
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [scanned, setScanned] = useState(0);
  const [skipped, setSkipped] = useState(0);

  useEffect(() => {
    try { localStorage.setItem("lead-scanner-saved", JSON.stringify(Array.from(savedIds))); } catch { /* Storage may be unavailable. Saving still works for this visit. */ }
  }, [savedIds]);

  const handleGps = () => {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported in this browser. Click the map to choose a center.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setScanMode("radius");
        setSelectedStateCode("");
      },
      () => setErrorMessage("Unable to retrieve your location. Click the map to choose a center."),
      { timeout: 10_000 },
    );
  };

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (isScanning) return;
      if (multiMode) {
        if (zones.some(zone => Math.abs(zone.lat - lat) < 0.000001 && Math.abs(zone.lng - lng) < 0.000001)) return;
        if (zones.length >= 5) { setErrorMessage("Maximum 5 zones. Clear to start again."); return; }
        setErrorMessage("");
        setZones((current) => [
          ...current,
          { id: createZoneId(), lat, lng, radiusMiles },
        ]);
        setScanMode("multi");
        return;
      }

      if (scanMode === "radius") {
        setCenter({ lat, lng });
      }
    },
    [multiMode, radiusMiles, scanMode, isScanning, zones],
  );

  const handleScan = async () => {
    if (!category.trim() || isScanning) return;
    if (multiMode && zones.length === 0) { setErrorMessage("Click the map to add at least one zone before scanning."); return; }
    setErrorMessage("");
    setSelectedLeadId(null);
    setLeads([]);
    setScanned(0);
    setSkipped(0);

    setIsScanning(true);
    setStatusMessage(
      scanMode === "state"
        ? `querying full state ${selectedStateCode}...`
        : multiMode
          ? `scanning ${zones.length} zones...`
          : "scanning radius...",
    );

    try {
      const payload =
        scanMode === "state"
          ? {
              category,
              mode: "state" as const,
              stateCode: selectedStateCode,
              useMock,
            }
          : multiMode
            ? {
                category,
                mode: "multi" as const,
                zones,
                useMock,
              }
            : {
                category,
                mode: "radius" as const,
                center,
                radiusMiles,
                useMock,
              };

      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(50_000),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Scan failed");
      }

      setLeads(data.leads ?? []);
      setScanned(data.scanned ?? 0);
      setSkipped(data.skipped ?? 0);
      setStatusMessage(data.provider === "mock" ? "Demo results — fictional businesses, do not contact." : `Scan complete via ${data.provider}. No website is recorded in the source; verify each lead.`);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Scan failed. Please retry.");
      setStatusMessage("scan failed");
    } finally {
      setIsScanning(false);
    }
  };

  const handleClear = () => {
    if (isScanning) return;
    setErrorMessage("");
    setSelectedLeadId(null);
    setLeads([]);
    setScanned(0);
    setSkipped(0);
    setZones([]);
    setStatusMessage("");
  };

  const handleToggleSave = (id: string) => {
    setSavedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header compact />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
        <ScanControls
          category={category}
          radiusMiles={radiusMiles}
          scanMode={scanMode}
          selectedStateCode={selectedStateCode}
          multiMode={multiMode}
          zoneCount={zones.length}
          isScanning={isScanning}
          useMock={useMock}
          onCategoryChange={setCategory}
          onRadiusChange={setRadiusMiles}
          onScanModeChange={setScanMode}
          onStateChange={setSelectedStateCode}
          onMultiModeToggle={() => {
            setScanMode(multiMode ? "radius" : "multi");
            setSelectedStateCode("");
          }}
          onUseMockToggle={() => setUseMock((value) => !value)}
          onGps={handleGps}
          onScan={handleScan}
          onClear={handleClear}
        />

        {multiMode && <div aria-label="Scan zones" className="flex flex-wrap items-center gap-2 rounded-lg border border-terminal-border bg-terminal-panel px-4 py-3 text-xs">
          <span className="mr-1 text-terminal">{zones.length}/5 zones</span>
          {zones.length === 0 && <span className="text-terminal-muted">Click the map to place your first zone. The radius applies to new zones.</span>}
          {zones.map((zone, index) => <div key={zone.id} className="flex items-center gap-2 rounded-md border border-terminal-border bg-[#050a08] px-3 py-2">
            <span title={`${zone.lat.toFixed(4)}, ${zone.lng.toFixed(4)}`} className="text-foreground">Zone {index + 1} · {zone.radiusMiles} mi</span>
            <button type="button" aria-label={`Remove zone ${index + 1}`} disabled={isScanning} onClick={() => { setZones(current => current.filter(item => item.id !== zone.id)); setErrorMessage(""); }} className="ml-1 text-terminal-muted hover:text-foreground disabled:opacity-40">×</button>
          </div>)}
          {zones.length > 0 && <span className="text-terminal-muted">Radius changes apply to new zones.</span>}
        </div>}
        {errorMessage && <p role="alert" className="rounded border border-red-400 p-3 text-sm text-red-200">{errorMessage}</p>}
        <p className="text-xs text-terminal-muted">Click the map to choose a center or add up to 5 zones. Live queries return at most 500 source records per area before filtering and may be incomplete; phone numbers and website availability are unverified. Demo mode returns fictional businesses.</p>
        <div className="grid gap-4 lg:h-[680px] lg:grid-cols-[1.15fr_1fr]">
          <ScannerMap
            center={center}
            onStateCenter={setCenter}
            radiusMiles={radiusMiles}
            zones={zones}
            selectedStateCode={scanMode === "state" ? selectedStateCode : undefined}
            leads={leads}
            selectedLeadId={selectedLeadId}
            onSelectLead={setSelectedLeadId}
            onMapClick={handleMapClick}
            multiMode={multiMode}
          />

          <div className="h-[640px] min-h-0 lg:h-full">
          <ResultsTable
            leads={leads}
            selectedLeadId={selectedLeadId}
            onSelectLead={setSelectedLeadId}
            savedIds={savedIds}
            isScanning={isScanning}
            statusMessage={statusMessage}
            scanned={scanned}
            skipped={skipped}
            onToggleSave={handleToggleSave}
          />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
