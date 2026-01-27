import { describe, expect, it } from "vitest";
import type {
  ColorMode,
  ScannerCapabilities,
  ScanSettings,
} from "@/app/features/scanner/services/escl-client";

describe("eSCL Client Types", () => {
  describe("ColorMode", () => {
    it("should accept valid color modes", () => {
      const modes: ColorMode[] = ["color", "grayscale", "blackwhite"];
      expect(modes).toHaveLength(3);
    });
  });

  describe("ScanSettings", () => {
    it("should create valid scan settings", () => {
      const settings: ScanSettings = {
        colorMode: "color",
        resolution: 300,
        format: "jpeg",
      };

      expect(settings.colorMode).toBe("color");
      expect(settings.resolution).toBe(300);
      expect(settings.format).toBe("jpeg");
    });
  });

  describe("ScannerCapabilities", () => {
    it("should create valid scanner capabilities", () => {
      const caps: ScannerCapabilities = {
        resolutions: [75, 150, 300, 600],
        colorModes: ["color", "grayscale"],
        formats: ["application/pdf", "image/jpeg"],
        maxWidth: 2550,
        maxHeight: 3300,
        minWidth: 16,
        minHeight: 16,
      };

      expect(caps.resolutions).toContain(300);
      expect(caps.colorModes).toContain("color");
      expect(caps.formats).toContain("image/jpeg");
    });
  });
});
