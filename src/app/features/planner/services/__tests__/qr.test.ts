import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { WeekId } from "@/app/shared/types";
import { encodeQRPayload, QRDecodeError, QREncodeError } from "../qr";

describe("QR Services", () => {
  describe("encodeQRPayload", () => {
    it("should generate a data URL", async () => {
      const result = await Effect.runPromise(
        encodeQRPayload("2026-W05" as WeekId, "/vault/path"),
      );

      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it("should generate different QR codes for different inputs", async () => {
      const result1 = await Effect.runPromise(
        encodeQRPayload("2026-W05" as WeekId, "/vault/path1"),
      );
      const result2 = await Effect.runPromise(
        encodeQRPayload("2026-W05" as WeekId, "/vault/path2"),
      );

      expect(result1).not.toBe(result2);
    });

    it("should generate different QR codes for different weeks", async () => {
      const result1 = await Effect.runPromise(
        encodeQRPayload("2026-W05" as WeekId, "/vault/path"),
      );
      const result2 = await Effect.runPromise(
        encodeQRPayload("2026-W06" as WeekId, "/vault/path"),
      );

      expect(result1).not.toBe(result2);
    });
  });

  describe("QREncodeError", () => {
    it("should create error with message", () => {
      const error = new QREncodeError({
        message: "Test error",
        cause: new Error("Original"),
      });

      expect(error.message).toBe("Test error");
      expect(error.cause).toBeInstanceOf(Error);
      expect(error._tag).toBe("QREncodeError");
    });
  });

  describe("QRDecodeError", () => {
    it("should create error with message", () => {
      const error = new QRDecodeError({
        message: "Decode failed",
      });

      expect(error.message).toBe("Decode failed");
      expect(error._tag).toBe("QRDecodeError");
    });
  });
});
