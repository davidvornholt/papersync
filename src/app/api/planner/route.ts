import { pdf } from "@react-pdf/renderer";
import { Effect } from "effect";
import { NextResponse } from "next/server";
import { PlannerDocument } from "@/app/features/planner/components/planner-document";
import {
  getWeekDateRange,
  getWeekId,
} from "@/app/features/planner/services/generator";
import { encodeQRPayload } from "@/app/features/planner/services/qr";
import type { Subject, WeekId } from "@/app/shared/types";

// ============================================================================
// Types
// ============================================================================

type GeneratePdfRequest = {
  weekId?: WeekId;
  subjects: Subject[];
  vaultPath: string;
};

// ============================================================================
// API Route Handler
// ============================================================================

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as GeneratePdfRequest;
    const { subjects, vaultPath, weekId: providedWeekId } = body;

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return NextResponse.json(
        { error: "Subjects are required and must be a non-empty array" },
        { status: 400 },
      );
    }

    if (!vaultPath || typeof vaultPath !== "string") {
      return NextResponse.json(
        { error: "Vault path is required" },
        { status: 400 },
      );
    }

    const weekId = providedWeekId ?? getWeekId();
    const dateRange = getWeekDateRange(weekId);

    // Generate QR code
    const qrResult = await Effect.runPromise(
      encodeQRPayload(weekId, vaultPath).pipe(
        Effect.map((qrDataUrl) => ({ success: true as const, qrDataUrl })),
        Effect.catchAll((error) =>
          Effect.succeed({ success: false as const, error: error.message }),
        ),
      ),
    );

    if (!qrResult.success) {
      return NextResponse.json(
        { error: `QR generation failed: ${qrResult.error}` },
        { status: 500 },
      );
    }

    // Generate PDF
    const document = PlannerDocument({
      weekId,
      dateRange,
      subjects,
      qrDataUrl: qrResult.qrDataUrl,
    });

    // Cast needed due to @react-pdf/renderer type mismatch with React 19
    const pdfBlob = await pdf(document as Parameters<typeof pdf>[0]).toBlob();

    // Convert Blob to ArrayBuffer for Response
    const arrayBuffer = await pdfBlob.arrayBuffer();

    // Return PDF as response
    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="planner-${weekId}.pdf"`,
        "Content-Length": arrayBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate planner PDF",
      },
      { status: 500 },
    );
  }
}
