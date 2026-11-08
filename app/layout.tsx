import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lead Scanner | Explore Local Business Leads",
  description:
    "Explore businesses with recorded phone numbers and no website listed in OpenStreetMap. Verify each lead or try clearly labeled demo data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="scanlines min-h-full bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
