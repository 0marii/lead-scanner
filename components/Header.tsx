import Link from "next/link";

const NAV_LINKS = [
  { href: "/", label: "HOME" },
  { href: "/#features", label: "FEATURES" },
  { href: "/#how-it-works", label: "HOW_IT_WORKS" },
  { href: "/#faq", label: "FAQ" },
  { href: "/scan", label: "LAUNCH APP" },
];

export function Header({ compact = false }: { compact?: boolean }) {
  return (
    <header
      className={`terminal-border border-x-0 border-t-0 bg-[#050807]/95 backdrop-blur ${
        compact ? "py-3" : "py-4"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="group flex items-center gap-2 text-terminal hover:opacity-90">
          <span className="text-lg">█</span>
          <span className="text-sm tracking-wider md:text-base">
            &gt;_ LEAD_SCANNER.EXE
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded border border-transparent px-3 py-1.5 text-xs text-terminal-muted transition hover:border-terminal-border hover:text-terminal"
            >
              [{link.label}]
            </Link>
          ))}
        </nav>

        <Link
          href="/scan"
          className="rounded border border-terminal/40 bg-terminal/10 px-3 py-1.5 text-xs text-terminal transition hover:bg-terminal/20 md:hidden"
        >
          [SCAN]
        </Link>
      </div>
    </header>
  );
}
