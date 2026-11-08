"use client";

import { TerminalSelect } from "@/components/TerminalSelect";
import { US_STATES } from "@/lib/states";

export type ScanMode = "radius" | "multi" | "state";

interface ScanControlsProps {
  category: string;
  radiusMiles: number;
  scanMode: ScanMode;
  selectedStateCode: string;
  multiMode: boolean;
  zoneCount: number;
  isScanning: boolean;
  useMock: boolean;
  onCategoryChange: (value: string) => void;
  onRadiusChange: (value: number) => void;
  onScanModeChange: (mode: ScanMode) => void;
  onStateChange: (code: string) => void;
  onMultiModeToggle: () => void;
  onUseMockToggle: () => void;
  onGps: () => void;
  onScan: () => void;
  onClear: () => void;
}

const RADIUS_OPTIONS = [5, 10, 15, 25, 50];

export function ScanControls({
  category,
  radiusMiles,
  scanMode,
  selectedStateCode,
  multiMode,
  zoneCount,
  isScanning,
  useMock,
  onCategoryChange,
  onRadiusChange,
  onScanModeChange,
  onStateChange,
  onMultiModeToggle,
  onUseMockToggle,
  onGps,
  onScan,
  onClear,
}: ScanControlsProps) {
  return (
    <fieldset disabled={isScanning} className="terminal-border relative z-20 min-w-0 rounded-xl bg-terminal-panel p-4 md:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-terminal-muted">
        <span>&gt; awaiting input</span>
        <span className="blink text-terminal">█</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1fr)_100px_minmax(190px,230px)_auto_auto]">
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-xs text-terminal-muted">category:</span>
          <input
            maxLength={80}
            value={category}
            onChange={(event) => onCategoryChange(event.target.value)}
            placeholder="plumbers, dentists, landscapers..."
            className="h-11 rounded-lg border border-terminal-border bg-[#050a08] px-3 text-sm text-foreground focus:border-terminal/60"
          />
        </label>

        <TerminalSelect
          label="radius:"
          value={String(radiusMiles)}
          options={RADIUS_OPTIONS.map(radius => ({ value: String(radius), label: `${radius} mi` }))}
          onChange={value => onRadiusChange(Number(value))}
          disabled={scanMode === "state" || isScanning}
        />

        <TerminalSelect
          label="state:"
          value={selectedStateCode}
          options={[{ value: "", label: "Select state…" }, ...US_STATES.map(state => ({ value: state.code, label: state.name }))]}
          onChange={value => { onStateChange(value); onScanModeChange(value ? "state" : "radius"); }}
          searchable
          disabled={isScanning}
        />

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={onGps}
            className="h-11 rounded-lg border border-terminal-border px-3 py-2 text-xs text-terminal-muted hover:border-terminal/40 hover:text-terminal"
          >
            [GPS]
          </button>
          <button
            type="button"
            aria-pressed={multiMode}
            onClick={onMultiModeToggle}
            className={`h-11 rounded-lg border px-3 py-2 text-xs ${
              multiMode
                ? "border-terminal bg-terminal/15 text-terminal"
                : "border-terminal-border text-terminal-muted hover:text-terminal"
            }`}
          >
            MULTI
          </button>
        </div>

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={onScan}
            disabled={isScanning || !category.trim() || (multiMode && zoneCount === 0)}
            className="h-11 rounded-lg border border-terminal/50 bg-terminal/10 px-4 py-2 text-sm text-terminal hover:bg-terminal/20 disabled:opacity-50"
          >
            {isScanning ? "SCANNING..." : "[ SCAN ]"}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="h-11 rounded-lg border border-terminal-border px-3 py-2 text-xs text-terminal-muted hover:text-terminal"
          >
            [CLR]
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-terminal-border/60 pt-3 text-xs text-terminal-muted">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={useMock}
            onChange={onUseMockToggle}
            className="accent-[#00ff9c]"
          />
          Use mock data (offline demo)
        </label>
        <span>
          Mode:{" "}
          <span className="text-terminal">
            {scanMode === "state"
              ? `FULL STATE (${selectedStateCode || "none"})`
              : multiMode
                ? "MULTI-ZONE"
                : "RADIUS"}
          </span>
        </span>
        {scanMode === "state" && (
          <span className="text-terminal-dim">State queries may return a limited subset of available data</span>
        )}
      </div>
    </fieldset>
  );
}
