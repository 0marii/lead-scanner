"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Lead } from "@/lib/types";

interface ResultsTableProps {
  leads: Lead[];
  savedIds: Set<string>;
  isScanning: boolean;
  statusMessage: string;
  scanned: number;
  skipped: number;
  selectedLeadId: string | null;
  onSelectLead: (id: string) => void;
  onToggleSave: (id: string) => void;
}

export function ResultsTable({
  leads,
  savedIds,
  isScanning,
  statusMessage,
  scanned,
  skipped,
  selectedLeadId,
  onSelectLead,
  onToggleSave,
}: ResultsTableProps) {
  const [query, setQuery] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const list = useRef<HTMLUListElement>(null);
  const savedCount = leads.filter(lead => savedIds.has(lead.id)).length;
  const visibleLeads = leads.filter(lead => (!savedOnly || savedIds.has(lead.id)) && `${lead.name} ${lead.address} ${lead.city} ${lead.phone}`.toLowerCase().includes(query.toLowerCase()));
  useEffect(() => {
    if (selectedLeadId) list.current?.querySelector<HTMLElement>(`[data-selected="true"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedLeadId]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);

  const exportLeads = useMemo(() => {
    const saved = leads.filter((lead) => savedIds.has(lead.id));
    return saved.length > 0 ? saved : leads;
  }, [leads, savedIds]);

  const handleExport = async (format: "csv" | "json" | "xlsx") => {
    if (exportLeads.length === 0 || exporting) return;
    setExportError("");

    setExporting(true);
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, leads: exportLeads }),
      });

      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "Export failed"); }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `leads.${format === "xlsx" ? "xlsx" : format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      setExportError(error instanceof Error ? error.message : "Export failed. Please retry.");
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  return (
    <section aria-label="Scan results" className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-terminal-border bg-terminal-panel">
      <div className="flex items-center justify-between gap-3 border-b border-terminal-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">{isScanning ? "Finding businesses…" : "Business leads"} <span className="ml-1 rounded bg-terminal/10 px-2 py-0.5 text-xs text-terminal">{leads.length}</span></h2>
          <p className="mt-1 text-xs text-terminal-muted">{scanned} scanned <span aria-hidden="true">·</span> {skipped} skipped <span aria-hidden="true">·</span> {savedCount} saved</p>
        </div>
        <div className="relative shrink-0">
          <button type="button" aria-expanded={exportOpen} aria-controls="export-options" onClick={() => setExportOpen(open => !open)} disabled={exportLeads.length === 0 || exporting} className="whitespace-nowrap rounded-lg border border-terminal-border px-3 py-2 text-xs text-foreground hover:border-terminal/50 disabled:opacity-40">[ EXPORT ▾ ]</button>
          {exportOpen && <div id="export-options" onKeyDown={event => { if (event.key === "Escape") setExportOpen(false); }} className="absolute right-0 z-20 mt-2 min-w-40 rounded-lg border border-terminal-border bg-[#0b1510] p-1 shadow-xl">
            <p className="px-3 py-2 text-[10px] text-terminal-muted">{exportLeads.length} {savedCount ? "saved" : "total"} leads</p>
            {(["csv", "json", "xlsx"] as const).map(format => <button key={format} type="button" disabled={exporting} onClick={() => handleExport(format)} className="block w-full rounded px-3 py-2 text-left text-xs uppercase text-foreground hover:bg-terminal/10">.{format}</button>)}
          </div>}
        </div>
      </div>
      <p role="status" aria-live="polite" className={`px-5 py-3 text-xs leading-relaxed ${leads.some(lead => lead.source === "mock") ? "border-b border-amber-300/15 bg-amber-300/5 text-amber-200/80" : "text-terminal-muted"}`}>{statusMessage || "Choose an area and run a scan to get started."}</p>
      {exportError && <p role="alert" className="px-5 py-2 text-xs text-red-200">{exportError}</p>}
      {leads.length > 0 && <div className="flex items-center gap-2 border-b border-terminal-border px-4 py-3">
        <input type="search" aria-label="Search leads" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search businesses, places, phone…" className="h-10 min-w-0 flex-1 rounded-lg border border-terminal-border bg-[#050a08] px-3 text-xs text-foreground placeholder:text-terminal-muted focus:border-terminal/50 focus:outline-none focus:ring-2 focus:ring-terminal/10" />
        <button type="button" aria-pressed={savedOnly} onClick={() => setSavedOnly(value => !value)} className={`h-10 shrink-0 rounded-lg border px-3 text-xs ${savedOnly ? "border-terminal/50 bg-terminal/10 text-terminal" : "border-terminal-border text-terminal-muted"}`}>Saved ({savedCount})</button>
      </div>}
      <ul ref={list} aria-label="Business leads" className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
        {visibleLeads.map(lead => {
          const number = leads.indexOf(lead) + 1;
          const selected = lead.id === selectedLeadId;
          return <li key={lead.id} data-selected={selected} className={`rounded-lg border p-4 transition ${selected ? "border-terminal/50 bg-terminal/[0.06]" : "border-terminal-border/60 bg-[#08100c] hover:border-terminal/30"}`}>
            <div className="flex items-start gap-3">
              <button type="button" aria-label={`Show ${lead.name} on map`} aria-pressed={selected} onClick={() => onSelectLead(lead.id)} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs ${selected ? "border-terminal bg-terminal text-[#050807]" : "border-terminal-border bg-terminal/5 text-terminal"}`}>{number}</button>
              <div className="min-w-0 flex-1">
                <button type="button" onClick={() => onSelectLead(lead.id)} className="text-left text-sm font-semibold leading-5 text-foreground hover:text-terminal">{lead.name}</button>
                <p className="mt-1 text-xs leading-5 text-terminal-muted">{lead.address || lead.city || "Address unavailable"}</p>
              </div>
              <button type="button" aria-pressed={savedIds.has(lead.id)} aria-label={`${savedIds.has(lead.id) ? "Unsave" : "Save"} ${lead.name}`} onClick={() => onToggleSave(lead.id)} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${savedIds.has(lead.id) ? "border-terminal/40 bg-terminal/10 text-terminal" : "border-terminal-border text-terminal-muted hover:text-terminal"}`}>
                <svg width="16" height="18" viewBox="0 0 16 18" aria-hidden="true" fill={savedIds.has(lead.id) ? "currentColor" : "none"}><path d="M3 2h10v14l-5-3-5 3V2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-terminal-border/40 pt-3 text-xs">
              {lead.source === "mock" ? <span className="whitespace-nowrap text-foreground">{lead.phone}</span> : <a href={`tel:${lead.phone.replace(/[^+0-9]/g, "")}`} className="whitespace-nowrap text-foreground hover:text-terminal">{lead.phone}</a>}
              <div className="flex items-center gap-3">
                {lead.rating !== "N/A" && <span className="whitespace-nowrap text-amber-200/80">★ {lead.rating}</span>}
                <a href={lead.mapsUrl} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-terminal-muted hover:text-terminal">Open map ↗</a>
              </div>
            </div>
          </li>;
        })}
        {visibleLeads.length === 0 && <li className="flex min-h-48 flex-col items-center justify-center gap-2 px-5 text-center">
          <span aria-hidden="true" className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl border border-terminal-border text-xl text-terminal-muted">⌕</span>
          <p className="text-sm text-foreground">{isScanning ? "Searching your selected area…" : leads.length ? "No leads match your filters." : statusMessage.startsWith("Scan complete") || statusMessage.startsWith("Demo results") ? "No matching businesses found. Try another category or area." : "Your leads will appear here"}</p>
          <p className="text-xs leading-5 text-terminal-muted">{leads.length ? "Try another search or turn off the saved filter." : "Select a business to explore it on the map."}</p>
        </li>}
      </ul>
      {leads.length > 0 && <div className="border-t border-terminal-border px-5 py-3 text-[11px] text-terminal-muted">Showing {visibleLeads.length} of {leads.length} <span aria-hidden="true">·</span> Select a numbered pin or a business to explore</div>}
    </section>
  );
}
