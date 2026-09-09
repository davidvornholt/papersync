import { Effect, Schema } from 'effect';
import jsQR from 'jsqr';
import { toDataURL } from 'qrcode';
import { QRPayload, type WeekId } from '@/shared/types/schemas';
import { QRDecodeError } from './qr-decode-error';
import { QREncodeError } from './qr-errors';

const hexadecimalRadix = 16;
const checksumWidth = 8;
const checksumMultiplier = 31;
const generateChecksum = (data: string): string => {
  let hash = 0;
  for (let i = 0; i < data.length; i += 1) {
    const char = data.charCodeAt(i);
    // biome-ignore lint/suspicious/noBitwiseOperators: The printed v1 QR checksum uses signed 32-bit overflow.
    hash = (Math.imul(hash, checksumMultiplier) + char) | 0;
  }
  return Math.abs(hash).toString(hexadecimalRadix).slice(0, checksumWidth);
};

export const encodeQRPayload = (
  weekId: WeekId,
): Effect.Effect<string, QREncodeError> =>
  Effect.tryPromise({
    try: () => {
      const payload: QRPayload = {
        week: weekId,
        checksum: generateChecksum(weekId),
        version: 1,
      };

      const jsonString = JSON.stringify(payload);
      return toDataURL(jsonString, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 120,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
    },
    catch: (error) =>
      new QREncodeError({
        message: 'Failed to encode QR payload',
        cause: error,
      }),
  });

export const decodeQRFromImageData = (
  imageData: ImageData,
): Effect.Effect<QRPayload, QRDecodeError> =>
  Effect.gen(function* () {
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (!code) {
      return yield* Effect.fail(
        new QRDecodeError({ message: 'No QR code found in image' }),
      );
    }

    const parsed = yield* Effect.try({
      try: () => JSON.parse(code.data),
      catch: () =>
        new QRDecodeError({ message: 'QR code does not contain valid JSON' }),
    });

    const decoded = yield* Schema.decodeUnknown(QRPayload)(parsed).pipe(
      Effect.mapError(
        () =>
          new QRDecodeError({ message: 'QR payload schema validation failed' }),
      ),
    );

    // Verify checksum
    const expectedChecksum = generateChecksum(decoded.week);
    if (decoded.checksum !== expectedChecksum) {
      return yield* Effect.fail(
        new QRDecodeError({ message: 'QR payload checksum mismatch' }),
      );
    }

    return decoded;
  });

export const decodeQRFromCanvas = (
  canvas: HTMLCanvasElement,
): Effect.Effect<QRPayload, QRDecodeError> =>
  Effect.gen(function* () {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return yield* Effect.fail(
        new QRDecodeError({ message: 'Failed to get canvas context' }),
      );
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return yield* decodeQRFromImageData(imageData);
  });
