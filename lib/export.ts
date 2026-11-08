import type { Lead } from "@/lib/types";
import ExcelJS from "exceljs";

export function leadsToCsv(leads: Lead[]): string {
  const headers = [
    "Name",
    "Phone",
    "City",
    "Address",
    "Rating",
    "Review Count",
    "Latitude",
    "Longitude",
    "Maps URL",
    "Category",
    "Source",
  ];

  const rows = leads.map((lead) => [
    lead.name,
    lead.phone,
    lead.city,
    lead.address,
    lead.rating,
    lead.reviewCount ?? "",
    lead.lat,
    lead.lng,
    lead.mapsUrl,
    lead.category,
    lead.source,
  ]);

  return [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const raw = String(cell ?? "");
          const value = typeof cell === "string" && /^[\s]*[=+@-]/.test(raw) ? `'${raw}` : raw;
          if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(","),
    )
    .join("\n");
}

export function leadsToJson(leads: Lead[]): string {
  return JSON.stringify(leads, null, 2);
}

export async function leadsToXlsxBuffer(leads: Lead[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Leads");
  sheet.addRow(["Name", "Phone", "City", "Address", "Rating", "Review Count", "Latitude", "Longitude", "Maps URL", "Category", "Source"]);
  for (const lead of leads) {
    sheet.addRow([lead.name, lead.phone, lead.city, lead.address, lead.rating, lead.reviewCount ?? "", lead.lat, lead.lng, lead.mapsUrl, lead.category, lead.source]);
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
