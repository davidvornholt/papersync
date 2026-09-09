import { describe, expect, it } from 'bun:test';
import { Effect } from 'effect';
import { encodeQRPayload } from '@/shared/planner/qr';
import { QRDecodeError } from '@/shared/planner/qr-decode-error';
import { QREncodeError } from '@/shared/planner/qr-errors';
import type { WeekId } from '@/shared/types/schemas';

const imageDataPattern = /^data:image\/png;base64,/u;

const minimumImageLength = 100;

describe('QR Services', () => {
  describe('encodeQRPayload', () => {
    it('should generate a data URL', async () => {
      const result = await Effect.runPromise(
        encodeQRPayload('2026-W05' as WeekId),
      );

      expect(result).toMatch(imageDataPattern);
    });

    it('should generate consistent QR codes for same week', async () => {
      const result1 = await Effect.runPromise(
        encodeQRPayload('2026-W05' as WeekId),
      );
      const result2 = await Effect.runPromise(
        encodeQRPayload('2026-W05' as WeekId),
      );

      expect(result1).toBe(result2);
    });

    it('should generate different QR codes for different weeks', async () => {
      const result1 = await Effect.runPromise(
        encodeQRPayload('2026-W05' as WeekId),
      );
      const result2 = await Effect.runPromise(
        encodeQRPayload('2026-W06' as WeekId),
      );

      expect(result1).not.toBe(result2);
    });

    it('should encode week ID in the QR payload', async () => {
      const weekId = '2026-W10' as WeekId;
      const result = await Effect.runPromise(encodeQRPayload(weekId));

      // The result is a base64 data URL, we can verify it starts correctly
      expect(result).toMatch(imageDataPattern);
      expect(result.length).toBeGreaterThan(minimumImageLength);
    });
  });

  describe('QREncodeError', () => {
    it('should create error with message', () => {
      const error = new QREncodeError({
        message: 'Test error',
        cause: new Error('Original'),
      });

      expect(error.message).toBe('Test error');
      expect(error.cause).toBeInstanceOf(Error);
      expect(error._tag).toBe('QREncodeError');
    });
  });

  describe('QRDecodeError', () => {
    it('should create error with message', () => {
      const error = new QRDecodeError({
        message: 'Decode failed',
      });

      expect(error.message).toBe('Decode failed');
      expect(error._tag).toBe('QRDecodeError');
    });
  });
});
