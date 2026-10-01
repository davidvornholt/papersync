import { Effect } from 'effect';
import { scanImageTypes } from '@/shared/ocr/services/vision-contract';
import { ScanPageError } from '../errors/scan-client';

const bytesPerMebibyte = 1_048_576;
// Phone cameras produce far more pixels than the model reads; about 2000 px on
// the long edge keeps handwriting legible at a fraction of the upload size.
const maximumLongEdge = 2048;
const jpegQuality = 0.85;
const keepOriginalMebibytes = 1.5;
const keepOriginalBytes = keepOriginalMebibytes * bytesPerMebibyte;
const maximumInputMebibytes = 40;
const maximumInputBytes = maximumInputMebibytes * bytesPerMebibyte;
const unsupportedImage =
  'Choose a JPEG, PNG, or WebP image no larger than 40 MB.';

const supportedTypes: ReadonlyArray<string> = scanImageTypes;
const isSupported = (file: Blob) =>
  file.size <= maximumInputBytes && supportedTypes.includes(file.type);

const encodeJpeg = (bitmap: ImageBitmap, scale: number) =>
  Effect.tryPromise({
    try: () => {
      const canvas = new OffscreenCanvas(
        Math.round(bitmap.width * scale),
        Math.round(bitmap.height * scale),
      );
      canvas
        .getContext('2d')
        ?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return canvas.convertToBlob({ type: 'image/jpeg', quality: jpegQuality });
    },
    catch: (cause) =>
      new ScanPageError({
        message: 'This photo could not be prepared. Take it again.',
        cause,
      }),
  });

/**
 * Applies the camera's orientation and shrinks large photos before they are
 * stored in the scan draft and uploaded.
 */
export const prepareScanPage = (
  file: Blob,
): Effect.Effect<Blob, ScanPageError> =>
  Effect.gen(function* () {
    if (!isSupported(file)) {
      return yield* new ScanPageError({ message: unsupportedImage });
    }
    const bitmap = yield* Effect.tryPromise({
      try: () => createImageBitmap(file, { imageOrientation: 'from-image' }),
      catch: (cause) => new ScanPageError({ message: unsupportedImage, cause }),
    });
    const longEdge = Math.max(bitmap.width, bitmap.height);
    if (longEdge <= maximumLongEdge && file.size <= keepOriginalBytes) {
      bitmap.close();
      return file;
    }
    return yield* encodeJpeg(
      bitmap,
      Math.min(1, maximumLongEdge / longEdge),
    ).pipe(Effect.ensuring(Effect.sync(() => bitmap.close())));
  });
