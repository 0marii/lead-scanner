import Link from "next/link";

const SOCIAL_LINKS = [
  {
    label: "LinkedIn",
    href: "https://jo.linkedin.com/in/alomari-se",
    path: "M5.2 3.5a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4ZM3.4 9.4H7v11.2H3.4zM9.2 9.4h3.4v1.5h.1a3.7 3.7 0 0 1 3.3-1.8c3.5 0 4.2 2.2 4.2 5.1v6.4h-3.6v-5.7c0-1.4 0-3.1-1.9-3.1s-2.1 1.5-2.1 3v5.8H9.2z",
  },
  {
    label: "GitHub",
    href: "https://github.com/0marii",
    path: "M12 .9a11.1 11.1 0 0 0-3.5 21.6c.6.1.8-.3.8-.6v-2.1c-3.3.7-4-1.4-4-1.4-.5-1.3-1.3-1.6-1.3-1.6-1.1-.8.1-.8.1-.8 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.3.8 1 .8 2v3c0 .4.2.7.8.6A11.1 11.1 0 0 0 12 .9Z",
  },
  {
    label: "Portfolio",
    href: "https://omari.vercel.app/",
    path: "M12 2 1 21h22L12 2Zm0 4.2L18.1 18H5.9L12 6.2Z",
  },
  {
    label: "Email",
    href: "mailto:mo.omari862@gmail.com",
    path: "M2 5h20v14H2V5Zm2 2v.5l8 5.3 8-5.3V7l-8 5.2L4 7Z",
  },
];

export function Footer() {
  return (
    <footer className="terminal-border border-x-0 border-b-0 bg-[#050807] py-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 text-center text-xs text-terminal-muted md:flex-row md:flex-wrap md:px-6 md:text-left">
        <div className="space-y-3">
          <p>© {new Date().getFullYear()} LEAD_SCANNER.EXE <span aria-hidden="true">·</span> OpenStreetMap data</p>
          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:justify-start">
            <Link href="/scan" className="transition hover:text-terminal">Launch App</Link>
            <Link href="/privacy" className="transition hover:text-terminal">Privacy</Link>
            <Link href="/terms" className="transition hover:text-terminal">Terms</Link>
          </nav>
        </div>

        <div className="flex flex-col items-center gap-2 md:items-end">
          <p>
            Made by{" "}
            <a href="https://github.com/0marii" target="_blank" rel="noopener noreferrer" className="text-foreground transition hover:text-terminal">
              Mohammad Al-Omari
            </a>
          </p>
          <nav aria-label="Connect with Mohammad Al-Omari" className="flex items-center gap-1">
            {SOCIAL_LINKS.map(({ label, href, path }) => (
              <a key={label} href={href} aria-label={label} title={label} {...(href.startsWith("https:") ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="flex h-10 w-10 items-center justify-center rounded-md border border-transparent transition hover:border-terminal-border hover:bg-terminal/5 hover:text-terminal">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d={path} /></svg>
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
