import Link from "next/link";
import { ReactNode } from "react";

interface TerminalButtonProps {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  variant?: "primary" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}

export function TerminalButton({
  href,
  onClick,
  children,
  variant = "primary",
  disabled = false,
  type = "button",
  className = "",
}: TerminalButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded border px-4 py-2 text-sm tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "border-terminal/50 bg-terminal/10 text-terminal hover:bg-terminal/20 pulse-glow"
      : "border-terminal-border text-terminal-muted hover:border-terminal/40 hover:text-terminal";

  const classes = `${base} ${styles} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}
