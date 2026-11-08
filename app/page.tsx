import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { TerminalButton } from "@/components/TerminalButton";

const PREVIEW_LEADS = [
  { name: "ABC Plumbing Co.", phone: "(555) 0182", city: "New York" },
  { name: "FastFix Services", phone: "(555) 0347", city: "Los Angeles" },
  { name: "Pro Pipe & Drain", phone: "(555) 0561", city: "Chicago" },
  { name: "Central Plumbing", phone: "(555) 0729", city: "Houston" },
  { name: "QuickFlow LLC", phone: "(555) 0914", city: "Phoenix" },
];

const FEATURES = [
  {
    title: "MAP SCANNING",
    body: "Queries OpenStreetMap via Overpass, with a short cache to reduce upstream load. Data coverage varies. Set a radius or select a full US state.",
  },
  {
    title: "MULTI-ZONE",
    body: "Drop multiple radius targets across the map, then hit SCAN once. All zones run in sequence and results are deduplicated automatically.",
  },
  {
    title: "INSTANT EXPORT",
    body: "Download leads with one click. CSV for spreadsheets, JSON for developers, XLSX for native Excel. Phone numbers and map links included.",
  },
];

const FAQ = [
  {
    q: "What is Lead Scanner?",
    a: "Lead Scanner finds local businesses with no recorded website. Search any city by category, set a radius on the map, or scan an entire US state to get businesses with a phone number but no recorded website.",
  },
  {
    q: "How does it find businesses with no recorded website?",
    a: "It uses the free OpenStreetMap Overpass API. Scans query OSM data, check each result for phone and website tags, and only return businesses that have a phone but no recorded website.",
  },
  {
    q: "Is Lead Scanner free to use?",
    a: "The default provider needs no API key or paid business-data account. The default provider uses public OpenStreetMap services. Hosting costs and service limits still apply.",
  },
  {
    q: "What information does each lead include?",
    a: "Business name, phone number, city, address, and a direct link to their OpenStreetMap profile.",
  },
  {
    q: "Can I export my leads?",
    a: "Yes. Export all leads as CSV, JSON, or XLSX with one click. Every export includes phone numbers and map links.",
  },
  {
    q: "Can I scan a full state?",
    a: "Yes. Select any US state from the dropdown and query a US state using Overpass. Results are capped at 500 source records before filtering, so scans are not exhaustive.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main>
        <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
          <p className="mb-4 text-xs text-terminal-muted">{"// FREE LEAD GENERATION TOOL v1.0"}</p>
          <h1 className="max-w-4xl text-3xl leading-tight text-terminal md:text-5xl">
            &gt; FIND_CLIENTS.EXE
            <span className="mt-3 block text-lg text-foreground md:text-2xl">
              Find local businesses with no recorded website — No API key required by default
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-sm text-terminal-muted md:text-base">
            Scan any city or full US state. Find local businesses with no recorded website. Export leads
            in seconds. Free public data — no card required, no API key needed.
          </p>

          <ul className="mt-8 space-y-2 text-sm text-terminal-muted">
            <li>[+] Free public data — OpenStreetMap data, no API key</li>
            <li>[+] Recorded phone number &amp; map link per lead</li>
            <li>[+] Export as CSV, JSON, or XLSX</li>
            <li>[+] Full-state scanning + multi-zone bulk scan</li>
          </ul>

          <div className="mt-10 flex flex-wrap gap-3">
            <TerminalButton href="/scan">[ START ]</TerminalButton>
            <TerminalButton href="/scan" variant="ghost">
              [ LAUNCH APP ]
            </TerminalButton>
          </div>

          <p className="mt-8 text-xs text-terminal-muted">
            START <span className="blink text-terminal">█</span>
          </p>
        </section>

        <section className="border-y border-terminal-border bg-terminal-panel/40 py-16">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <p className="mb-6 text-xs text-terminal-muted">&gt; PRODUCT_PREVIEW — FICTIONAL DEMO DATA</p>
            <div className="terminal-border terminal-glow rounded p-4 md:p-6">
              <p className="mb-4 text-sm text-terminal">
                +--- LEAD_SCANNER.EXE :: SCAN IN PROGRESS ---+
              </p>
              <p className="mb-4 text-sm text-terminal-muted">&gt; plumbers_ [ SCAN ]</p>
              <div className="mb-4 flex gap-1">
                {Array.from({ length: 6 }).map((_, index) => (
                  <span
                    key={index}
                    className="h-2 w-2 rounded-full bg-terminal pulse-glow"
                    style={{ animationDelay: `${index * 0.2}s` }}
                  />
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase text-terminal-muted">
                    <tr>
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Phone</th>
                      <th className="py-2">City</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PREVIEW_LEADS.map((lead) => (
                      <tr key={lead.name} className="border-t border-terminal-border/60">
                        <td className="py-2 pr-4 text-terminal">{lead.name}</td>
                        <td className="py-2 pr-4">{lead.phone}</td>
                        <td className="py-2 text-terminal-muted">{lead.city}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-sm text-terminal">
                &gt; 5 LEADS FOUND [12 SCANNED / 7 SKIPPED]
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <p className="mb-8 text-xs text-terminal-muted">&gt; FEATURES.LST</p>
            <div className="grid gap-6 md:grid-cols-3">
              {FEATURES.map((feature) => (
                <article
                  key={feature.title}
                  className="terminal-border rounded bg-terminal-panel/50 p-5"
                >
                  <h2 className="mb-3 text-sm text-terminal">{feature.title}</h2>
                  <p className="text-sm leading-relaxed text-terminal-muted">{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <p className="mb-8 text-xs text-terminal-muted">&gt; HOW_IT_WORKS.MD</p>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "SET TARGET",
                  body: "Type any business category: plumbers, dentists, landscapers. Set radius, multi-zone, or select a full US state.",
                },
                {
                  step: "02",
                  title: "SCAN",
                  body: "Hit [ SCAN ]. Leads with no recorded website and a recorded phone number appear after the scan completes.",
                },
                {
                  step: "03",
                  title: "EXPORT",
                  body: "Download your list as CSV, JSON, or XLSX. Call, email, or import into your CRM and close deals.",
                },
              ].map((item) => (
                <article key={item.step} className="terminal-border rounded p-5">
                  <p className="text-2xl text-terminal/40">{item.step}</p>
                  <h3 className="mt-2 text-sm text-terminal">{item.title}</h3>
                  <p className="mt-3 text-sm text-terminal-muted">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="border-t border-terminal-border bg-terminal-panel/20 py-16">
          <div className="mx-auto max-w-3xl px-4 md:px-6">
            <p className="mb-8 text-xs text-terminal-muted">&gt; FAQ.TXT</p>
            <div className="space-y-4">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="terminal-border rounded bg-[#050807] p-4 open:border-terminal/30"
                >
                  <summary className="cursor-pointer text-sm text-terminal">{item.q}</summary>
                  <p className="mt-3 text-sm leading-relaxed text-terminal-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 text-center md:px-6">
            <p className="text-xs text-terminal-muted">&gt; READY_TO_PROSPECT</p>
            <h2 className="mt-4 text-2xl text-terminal md:text-4xl">
              Stop guessing. Start scanning. Free.
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <TerminalButton href="/scan">[ LAUNCH APP ]</TerminalButton>
              <TerminalButton href="/scan" variant="ghost">
                [ VIEW SCANNER ]
              </TerminalButton>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
