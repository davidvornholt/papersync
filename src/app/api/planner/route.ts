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

type TimetableSlot = {
  id: string;
  subjectId: string;
};

type TimetableDay = {
  day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
  slots: TimetableSlot[];
};

type GeneratePdfRequest = {
  weekId?: WeekId;
  subjects: Subject[];
  timetable: TimetableDay[];
};

// ============================================================================
// API Route Handler
// ============================================================================

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as GeneratePdfRequest;
    const { subjects, timetable, weekId: providedWeekId } = body;

    if (!subjects || !Array.isArray(subjects)) {
      return NextResponse.json(
        { error: "Subjects must be an array" },
        { status: 400 },
      );
    }

    if (!timetable || !Array.isArray(timetable)) {
      return NextResponse.json(
        { error: "Timetable must be an array" },
        { status: 400 },
      );
    }

    const weekId = providedWeekId ?? getWeekId();
    const dateRange = getWeekDateRange(weekId);

    // Generate QR code (only contains week info now)
    const qrResult = await Effect.runPromise(
      encodeQRPayload(weekId).pipe(
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
      timetable,
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
