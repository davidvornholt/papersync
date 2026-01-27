import { Schema } from "@effect/schema";
import { Data, Effect } from "effect";
import jsQR from "jsqr";
import QRCode from "qrcode";
import type { QRPayload, WeekId } from "@/app/shared/types";

// ============================================================================
// Error Types
// ============================================================================

export class QREncodeError extends Data.TaggedError("QREncodeError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class QRDecodeError extends Data.TaggedError("QRDecodeError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// ============================================================================
// QR Payload Schema (for validation)
// ============================================================================

const QRPayloadSchema = Schema.Struct({
  week: Schema.String,
  vault: Schema.String,
  checksum: Schema.String,
  version: Schema.Literal(1),
});

// ============================================================================
// Checksum Generation
// ============================================================================

const generateChecksum = (data: string): string => {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).slice(0, 8);
};

// ============================================================================
// Encode QR Payload
// ============================================================================

export const encodeQRPayload = (
  weekId: WeekId,
  vaultPath: string,
): Effect.Effect<string, QREncodeError> =>
  Effect.tryPromise({
    try: async () => {
      const payload: QRPayload = {
        week: weekId,
        vault: vaultPath,
        checksum: generateChecksum(`${weekId}:${vaultPath}`),
        version: 1,
      };

      const jsonString = JSON.stringify(payload);
      const dataUrl = await QRCode.toDataURL(jsonString, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 120,
        color: {
          dark: "#1C1917",
          light: "#FFFFFF",
        },
      });

      return dataUrl;
    },
    catch: (error) =>
      new QREncodeError({
        message: "Failed to encode QR payload",
        cause: error,
      }),
  });

// ============================================================================
// Decode QR from Image Data
// ============================================================================

export const decodeQRFromImageData = (
  imageData: ImageData,
): Effect.Effect<QRPayload, QRDecodeError> =>
  Effect.gen(function* () {
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (!code) {
      return yield* Effect.fail(
        new QRDecodeError({ message: "No QR code found in image" }),
      );
    }

    const parsed = yield* Effect.try({
      try: () => JSON.parse(code.data),
      catch: () =>
        new QRDecodeError({ message: "QR code does not contain valid JSON" }),
    });

    const decoded = yield* Schema.decodeUnknown(QRPayloadSchema)(parsed).pipe(
      Effect.mapError(
        () =>
          new QRDecodeError({ message: "QR payload schema validation failed" }),
      ),
    );

    // Verify checksum
    const expectedChecksum = generateChecksum(
      `${decoded.week}:${decoded.vault}`,
    );
    if (decoded.checksum !== expectedChecksum) {
      return yield* Effect.fail(
        new QRDecodeError({ message: "QR payload checksum mismatch" }),
      );
    }

    return decoded as QRPayload;
  });

// ============================================================================
// Decode QR from Canvas
// ============================================================================

export const decodeQRFromCanvas = (
  canvas: HTMLCanvasElement,
): Effect.Effect<QRPayload, QRDecodeError> =>
  Effect.gen(function* () {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return yield* Effect.fail(
        new QRDecodeError({ message: "Failed to get canvas context" }),
      );
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return yield* decodeQRFromImageData(imageData);
  });
