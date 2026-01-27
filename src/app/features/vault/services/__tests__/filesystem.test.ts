import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  makeLocalVaultLayer,
  type VaultFileNotFoundError,
  VaultService,
} from "../filesystem";

describe("Local Filesystem VaultService", () => {
  let testVaultPath: string;

  beforeEach(async () => {
    // Create a temporary directory for each test
    testVaultPath = await fs.mkdtemp(path.join(os.tmpdir(), "papersync-test-"));
  });

  afterEach(async () => {
    // Clean up the temporary directory
    try {
      await fs.rm(testVaultPath, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("setVaultPath", () => {
    it("should accept a valid directory path", async () => {
      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        // testVaultPath is already a valid directory
        yield* vault.setVaultPath(testVaultPath);
        return yield* vault.getVaultPath();
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      const result = await Effect.runPromise(program);
      expect(result).toBe(testVaultPath);
    });

    it("should reject a non-existent path", async () => {
      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        yield* vault.setVaultPath("/non/existent/path/that/does/not/exist");
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      await expect(Effect.runPromise(program)).rejects.toThrow();
    });

    it("should reject a file path (not a directory)", async () => {
      // Create a file
      const filePath = path.join(testVaultPath, "test.txt");
      await fs.writeFile(filePath, "test content");

      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        yield* vault.setVaultPath(filePath);
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      await expect(Effect.runPromise(program)).rejects.toThrow();
    });
  });

  describe("readFile", () => {
    it("should read an existing file", async () => {
      const content = "Hello, PaperSync!";
      await fs.writeFile(path.join(testVaultPath, "test.md"), content);

      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        return yield* vault.readFile("test.md");
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      const result = await Effect.runPromise(program);
      expect(result).toBe(content);
    });

    it("should return VaultFileNotFoundError for non-existent file", async () => {
      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        return yield* vault.readFile("does-not-exist.md");
      }).pipe(
        Effect.provide(makeLocalVaultLayer(testVaultPath)),
        Effect.flip, // Convert error channel to success channel
      );

      const error = await Effect.runPromise(program);
      expect(error._tag).toBe("VaultFileNotFoundError");
      expect((error as VaultFileNotFoundError).filePath).toBe(
        "does-not-exist.md",
      );
    });

    it("should read nested files", async () => {
      const nestedDir = path.join(testVaultPath, "nested", "deeply");
      await fs.mkdir(nestedDir, { recursive: true });
      await fs.writeFile(path.join(nestedDir, "note.md"), "nested content");

      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        return yield* vault.readFile("nested/deeply/note.md");
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      const result = await Effect.runPromise(program);
      expect(result).toBe("nested content");
    });
  });

  describe("writeFile", () => {
    it("should write a new file", async () => {
      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        yield* vault.writeFile("new-file.md", "new content");
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      await Effect.runPromise(program);

      const content = await fs.readFile(
        path.join(testVaultPath, "new-file.md"),
        "utf-8",
      );
      expect(content).toBe("new content");
    });

    it("should create nested directories", async () => {
      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        yield* vault.writeFile("new/nested/path/note.md", "nested content");
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      await Effect.runPromise(program);

      const content = await fs.readFile(
        path.join(testVaultPath, "new/nested/path/note.md"),
        "utf-8",
      );
      expect(content).toBe("nested content");
    });

    it("should overwrite existing file", async () => {
      await fs.writeFile(
        path.join(testVaultPath, "existing.md"),
        "old content",
      );

      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        yield* vault.writeFile("existing.md", "new content");
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      await Effect.runPromise(program);

      const content = await fs.readFile(
        path.join(testVaultPath, "existing.md"),
        "utf-8",
      );
      expect(content).toBe("new content");
    });
  });

  describe("fileExists", () => {
    it("should return true for existing file", async () => {
      await fs.writeFile(path.join(testVaultPath, "exists.md"), "content");

      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        return yield* vault.fileExists("exists.md");
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      const result = await Effect.runPromise(program);
      expect(result).toBe(true);
    });

    it("should return false for non-existent file", async () => {
      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        return yield* vault.fileExists("does-not-exist.md");
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      const result = await Effect.runPromise(program);
      expect(result).toBe(false);
    });
  });

  describe("listFiles", () => {
    it("should list files in a directory", async () => {
      await fs.writeFile(path.join(testVaultPath, "file1.md"), "");
      await fs.writeFile(path.join(testVaultPath, "file2.md"), "");
      await fs.mkdir(path.join(testVaultPath, "subdir"));

      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        return yield* vault.listFiles(".");
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      const result = await Effect.runPromise(program);
      expect(result).toContain("file1.md");
      expect(result).toContain("file2.md");
      // Directories should not be included
      expect(result).not.toContain("subdir");
    });

    it("should return empty array for non-existent directory", async () => {
      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        return yield* vault.listFiles("non-existent");
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      const result = await Effect.runPromise(program);
      expect(result).toEqual([]);
    });
  });

  describe("ensureDirectory", () => {
    it("should create a new directory", async () => {
      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        yield* vault.ensureDirectory("new-directory");
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      await Effect.runPromise(program);

      const stats = await fs.stat(path.join(testVaultPath, "new-directory"));
      expect(stats.isDirectory()).toBe(true);
    });

    it("should create nested directories", async () => {
      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        yield* vault.ensureDirectory("deep/nested/directory");
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      await Effect.runPromise(program);

      const stats = await fs.stat(
        path.join(testVaultPath, "deep/nested/directory"),
      );
      expect(stats.isDirectory()).toBe(true);
    });

    it("should succeed if directory already exists", async () => {
      await fs.mkdir(path.join(testVaultPath, "existing-dir"));

      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        yield* vault.ensureDirectory("existing-dir");
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      // Should not throw
      await Effect.runPromise(program);
    });
  });

  describe("deleteFile", () => {
    it("should delete an existing file", async () => {
      await fs.writeFile(path.join(testVaultPath, "to-delete.md"), "content");

      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        yield* vault.deleteFile("to-delete.md");
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      await Effect.runPromise(program);

      await expect(
        fs.access(path.join(testVaultPath, "to-delete.md")),
      ).rejects.toThrow();
    });

    it("should throw for non-existent file", async () => {
      const program = Effect.gen(function* () {
        const vault = yield* VaultService;
        yield* vault.deleteFile("does-not-exist.md");
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      await expect(Effect.runPromise(program)).rejects.toThrow();
    });
  });

  describe("end-to-end workflow", () => {
    it("should support full vault initialization workflow", async () => {
      const program = Effect.gen(function* () {
        const vault = yield* VaultService;

        // Create directory structure
        yield* vault.ensureDirectory("PaperSync/.papersync");
        yield* vault.ensureDirectory("PaperSync/Weekly");

        // Write config
        yield* vault.writeFile(
          "PaperSync/.papersync/config.json",
          JSON.stringify({ vaultPath: testVaultPath }, null, 2),
        );

        // Verify config exists
        const configExists = yield* vault.fileExists(
          "PaperSync/.papersync/config.json",
        );
        expect(configExists).toBe(true);

        // Read config back
        const configContent = yield* vault.readFile(
          "PaperSync/.papersync/config.json",
        );
        const config = JSON.parse(configContent);
        expect(config.vaultPath).toBe(testVaultPath);

        // Write weekly note
        yield* vault.writeFile(
          "PaperSync/Weekly/2026-W05.md",
          "# Week 5\n\n## Monday\n- [ ] Task 1",
        );

        // List weekly notes
        const weeklyNotes = yield* vault.listFiles("PaperSync/Weekly");
        expect(weeklyNotes).toContain("2026-W05.md");

        return "success";
      }).pipe(Effect.provide(makeLocalVaultLayer(testVaultPath)));

      const result = await Effect.runPromise(program);
      expect(result).toBe("success");
    });
  });
});
