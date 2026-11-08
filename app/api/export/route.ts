import { NextRequest, NextResponse } from "next/server";
import { leadsToCsv, leadsToJson, leadsToXlsxBuffer } from "@/lib/export";
import { validateExport } from "@/lib/validation";
import { guard, readJson, apiError } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    guard(request, "export", 30);
    const body = validateExport(await readJson(request, 2_000_000));

    const timestamp = new Date().toISOString().slice(0, 10);

    if (body.format === "json") {
      return new NextResponse(leadsToJson(body.leads), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="leads-${timestamp}.json"`,
        },
      });
    }

    if (body.format === "xlsx") {
      const buffer = await leadsToXlsxBuffer(body.leads);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="leads-${timestamp}.xlsx"`,
        },
      });
    }

    return new NextResponse(leadsToCsv(body.leads), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="leads-${timestamp}.csv"`,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
