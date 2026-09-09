import { Effect, Option } from 'effect';
import { decodeQRFromCanvas } from '@/shared/planner/qr';
import { QRDecodeError } from '@/shared/planner/qr-decode-error';
export const getImageWeek = (file: File) =>
  Effect.acquireUseRelease(
    Effect.tryPromise({
      try: () => createImageBitmap(file),
      catch: (cause) =>
        new QRDecodeError({
          message:
            'Cannot inspect the image. Choose the printed week manually.',
          cause,
        }),
    }),
    (bitmap) =>
      Effect.gen(function* () {
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext('2d');
        if (!context) {
          return yield* Effect.fail(
            new QRDecodeError({
              message:
                'Cannot inspect the image. Choose the printed week manually.',
            }),
          );
        }
        context.drawImage(bitmap, 0, 0);
        return yield* decodeQRFromCanvas(canvas);
      }),
    (bitmap) => Effect.sync(() => bitmap.close()),
  ).pipe(Effect.option, Effect.map(Option.getOrNull));
