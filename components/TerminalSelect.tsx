"use client";

import { useEffect, useId, useRef, useState } from "react";

interface SelectOption { value: string; label: string }
interface TerminalSelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  searchable?: boolean;
}

export function TerminalSelect({ label, value, options, onChange, disabled, searchable }: TerminalSelectProps) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const visible = options.filter(option => `${option.label} ${option.value}`.toLowerCase().includes(query.toLowerCase()));
  const current = options.find(option => option.value === value);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, id]);

  function show() {
    setQuery("");
    setActive(Math.max(0, options.findIndex(option => option.value === value)));
    setOpen(true);
  }
  function choose(option: SelectOption) {
    onChange(option.value);
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <div ref={root} className="relative min-w-0" onKeyDown={event => {
      if (disabled) return;
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
      if (event.key === "Tab") setOpen(false);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!open) show();
        else setActive(index => visible.length ? (index + (event.key === "ArrowDown" ? 1 : -1) + visible.length) % visible.length : 0);
      }
      if (open && event.key === "Enter") {
        event.preventDefault();
        if (visible[active]) choose(visible[active]);
      }
      if (open && !(event.target instanceof HTMLInputElement) && (event.key === "Home" || event.key === "End")) {
        event.preventDefault(); setActive(event.key === "Home" ? 0 : Math.max(0, visible.length - 1));
      }
    }}>
      <span id={`${id}-label`} className="mb-1.5 block text-xs text-terminal-muted">{label}</span>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-labelledby={`${id}-label`}
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-haspopup="listbox"
        aria-activedescendant={open && !searchable && visible[active] ? `${id}-option-${active}` : undefined}
        disabled={disabled}
        onClick={() => open ? setOpen(false) : show()}
        className={`flex h-11 w-full items-center justify-between gap-3 rounded-lg border bg-[#050a08] px-3 text-left text-sm text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terminal/15 disabled:cursor-not-allowed disabled:opacity-40 ${open ? "border-terminal/60" : "border-terminal-border hover:border-terminal/50"}`}
      >
        <span className="truncate">{current?.label ?? "Choose an option"}</span>
        <svg aria-hidden="true" viewBox="0 0 16 16" className={`h-4 w-4 shrink-0 text-terminal-muted transition-transform ${open ? "rotate-180" : ""}`} fill="none"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-terminal/30 bg-[#0b1510] shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
          {searchable && (
            <div className="border-b border-terminal-border p-2">
              <input autoFocus aria-label="Search states" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls={`${id}-list`} aria-activedescendant={visible[active] ? `${id}-option-${active}` : undefined} value={query} onChange={event => { setQuery(event.target.value); setActive(0); }} placeholder="Search by name or code…" className="h-10 w-full rounded-md border border-terminal-border bg-[#050a08] px-3 text-xs text-foreground placeholder:text-terminal-muted focus:border-terminal/50 focus:outline-none focus:ring-2 focus:ring-terminal/10" />
            </div>
          )}
          <div id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`} className="max-h-[min(240px,40vh)] overflow-y-auto overscroll-contain p-1.5">
            {visible.map((option, index) => (
              <button key={option.value} id={`${id}-option-${index}`} type="button" role="option" aria-selected={option.value === value} tabIndex={-1} onPointerMove={() => setActive(index)} onClick={() => choose(option)} className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition ${index === active ? "bg-terminal/10 text-terminal" : "text-foreground hover:bg-terminal/5"}`}>
                <span>{option.label}</span>
                {option.value === value && <span aria-hidden="true" className="text-terminal">✓</span>}
              </button>
            ))}
            {visible.length === 0 && <p className="px-3 py-4 text-xs text-terminal-muted">No states found.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
