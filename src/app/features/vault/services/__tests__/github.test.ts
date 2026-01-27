import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import {
  type DeviceCodeResponse,
  GitHubAPIError,
  GitHubAuthError,
  GitHubService,
  GitHubServiceLive,
  type OAuthTokenResponse,
} from "../github";

describe("GitHubService Interface", () => {
  describe("initiateDeviceFlow", () => {
    it("should have correct interface signature", () => {
      // Type-level test to ensure the interface is correctly defined
      const mockService: GitHubService = {
        initiateDeviceFlow: (_clientId: string) =>
          Effect.succeed({
            deviceCode: "test-device-code",
            userCode: "TEST-1234",
            verificationUri: "https://github.com/login/device",
            expiresIn: 900,
            interval: 5,
          }),
        pollForToken: () =>
          Effect.succeed({
            accessToken: "test-token",
            tokenType: "bearer",
            scope: "repo",
          }),
        getFileContent: () => Effect.succeed("file content"),
        createOrUpdateFile: () => Effect.succeed(undefined),
        listRepositories: () => Effect.succeed([]),
      };

      expect(mockService.initiateDeviceFlow).toBeDefined();
    });
  });

  describe("DeviceCodeResponse type", () => {
    it("should have all required fields", () => {
      const response: DeviceCodeResponse = {
        deviceCode: "abc123",
        userCode: "USER-CODE",
        verificationUri: "https://github.com/login/device",
        expiresIn: 900,
        interval: 5,
      };

      expect(response.deviceCode).toBe("abc123");
      expect(response.userCode).toBe("USER-CODE");
      expect(response.verificationUri).toBe("https://github.com/login/device");
      expect(response.expiresIn).toBe(900);
      expect(response.interval).toBe(5);
    });
  });

  describe("OAuthTokenResponse type", () => {
    it("should have all required fields", () => {
      const response: OAuthTokenResponse = {
        accessToken: "gho_abcdef123456",
        tokenType: "bearer",
        scope: "repo",
      };

      expect(response.accessToken).toBe("gho_abcdef123456");
      expect(response.tokenType).toBe("bearer");
      expect(response.scope).toBe("repo");
    });
  });

  describe("GitHubAuthError", () => {
    it("should create error with message", () => {
      const error = new GitHubAuthError({ message: "Auth failed" });
      expect(error._tag).toBe("GitHubAuthError");
      expect(error.message).toBe("Auth failed");
    });

    it("should create error with cause", () => {
      const cause = new Error("Network error");
      const error = new GitHubAuthError({
        message: "Auth failed",
        cause,
      });
      expect(error.cause).toBe(cause);
    });
  });

  describe("GitHubAPIError", () => {
    it("should create error with message", () => {
      const error = new GitHubAPIError({ message: "API request failed" });
      expect(error._tag).toBe("GitHubAPIError");
      expect(error.message).toBe("API request failed");
    });

    it("should create error with status code", () => {
      const error = new GitHubAPIError({
        message: "Not found",
        status: 404,
      });
      expect(error.status).toBe(404);
    });
  });

  describe("GitHubServiceLive layer", () => {
    it("should provide a valid GitHubService", async () => {
      const program = Effect.gen(function* () {
        const service = yield* GitHubService;
        return typeof service.initiateDeviceFlow === "function";
      }).pipe(Effect.provide(GitHubServiceLive));

      const result = await Effect.runPromise(program);
      expect(result).toBe(true);
    });

    it("should have all required methods", async () => {
      const program = Effect.gen(function* () {
        const service = yield* GitHubService;
        return {
          hasInitiateDeviceFlow:
            typeof service.initiateDeviceFlow === "function",
          hasPollForToken: typeof service.pollForToken === "function",
          hasGetFileContent: typeof service.getFileContent === "function",
          hasCreateOrUpdateFile:
            typeof service.createOrUpdateFile === "function",
          hasListRepositories: typeof service.listRepositories === "function",
        };
      }).pipe(Effect.provide(GitHubServiceLive));

      const result = await Effect.runPromise(program);
      expect(result.hasInitiateDeviceFlow).toBe(true);
      expect(result.hasPollForToken).toBe(true);
      expect(result.hasGetFileContent).toBe(true);
      expect(result.hasCreateOrUpdateFile).toBe(true);
      expect(result.hasListRepositories).toBe(true);
    });
  });
});

describe("GitHubService Mock Implementation", () => {
  // Create a mock implementation for testing
  const createMockGitHubService = (overrides?: Partial<GitHubService>) => {
    const defaultMock: GitHubService = {
      initiateDeviceFlow: () =>
        Effect.succeed({
          deviceCode: "mock-device-code",
          userCode: "MOCK-1234",
          verificationUri: "https://github.com/login/device",
          expiresIn: 900,
          interval: 5,
        }),
      pollForToken: () =>
        Effect.succeed({
          accessToken: "mock-access-token",
          tokenType: "bearer",
          scope: "repo",
        }),
      getFileContent: () => Effect.succeed("mock file content"),
      createOrUpdateFile: () => Effect.succeed(undefined),
      listRepositories: () =>
        Effect.succeed([
          {
            name: "obsidian-vault",
            owner: "user",
            fullName: "user/obsidian-vault",
          },
        ]),
    };

    return { ...defaultMock, ...overrides };
  };

  describe("device flow", () => {
    it("should return device code response", async () => {
      const mockService = createMockGitHubService();
      const layer = Layer.succeed(GitHubService, mockService);

      const program = Effect.gen(function* () {
        const service = yield* GitHubService;
        return yield* service.initiateDeviceFlow("test-client-id");
      }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(program);
      expect(result.deviceCode).toBe("mock-device-code");
      expect(result.userCode).toBe("MOCK-1234");
      expect(result.verificationUri).toBe("https://github.com/login/device");
    });

    it("should poll for token and return access token", async () => {
      const mockService = createMockGitHubService();
      const layer = Layer.succeed(GitHubService, mockService);

      const program = Effect.gen(function* () {
        const service = yield* GitHubService;
        return yield* service.pollForToken(
          "test-client-id",
          "mock-device-code",
          5,
        );
      }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(program);
      expect(result.accessToken).toBe("mock-access-token");
      expect(result.tokenType).toBe("bearer");
      expect(result.scope).toBe("repo");
    });
  });

  describe("repository operations", () => {
    it("should list repositories", async () => {
      const mockService = createMockGitHubService();
      const layer = Layer.succeed(GitHubService, mockService);

      const program = Effect.gen(function* () {
        const service = yield* GitHubService;
        return yield* service.listRepositories("mock-token");
      }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(program);
      expect(result).toHaveLength(1);
      expect(result[0].fullName).toBe("user/obsidian-vault");
    });

    it("should get file content", async () => {
      const mockService = createMockGitHubService({
        getFileContent: () => Effect.succeed("# Weekly Note\n\n## Monday"),
      });
      const layer = Layer.succeed(GitHubService, mockService);

      const program = Effect.gen(function* () {
        const service = yield* GitHubService;
        return yield* service.getFileContent(
          "mock-token",
          "user",
          "obsidian-vault",
          "Weekly/2026-W05.md",
        );
      }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(program);
      expect(result).toBe("# Weekly Note\n\n## Monday");
    });

    it("should return null for non-existent file", async () => {
      const mockService = createMockGitHubService({
        getFileContent: () => Effect.succeed(null),
      });
      const layer = Layer.succeed(GitHubService, mockService);

      const program = Effect.gen(function* () {
        const service = yield* GitHubService;
        return yield* service.getFileContent(
          "mock-token",
          "user",
          "obsidian-vault",
          "non-existent.md",
        );
      }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(program);
      expect(result).toBeNull();
    });

    it("should create or update file", async () => {
      const createOrUpdateFileSpy = vi.fn(() => Effect.succeed(undefined));
      const mockService = createMockGitHubService({
        createOrUpdateFile: createOrUpdateFileSpy,
      });
      const layer = Layer.succeed(GitHubService, mockService);

      const program = Effect.gen(function* () {
        const service = yield* GitHubService;
        yield* service.createOrUpdateFile(
          "mock-token",
          "user",
          "obsidian-vault",
          "Weekly/2026-W05.md",
          "# Weekly Note\n\n## Monday",
          "Update weekly note",
        );
      }).pipe(Effect.provide(layer));

      await Effect.runPromise(program);
      expect(createOrUpdateFileSpy).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should handle auth errors", async () => {
      const mockService = createMockGitHubService({
        initiateDeviceFlow: () =>
          Effect.fail(new GitHubAuthError({ message: "Invalid client ID" })),
      });
      const layer = Layer.succeed(GitHubService, mockService);

      const program = Effect.gen(function* () {
        const service = yield* GitHubService;
        return yield* service.initiateDeviceFlow("invalid-client-id");
      }).pipe(
        Effect.provide(layer),
        Effect.flip, // Convert error channel to success channel
      );

      const error = await Effect.runPromise(program);
      expect(error._tag).toBe("GitHubAuthError");
      expect((error as GitHubAuthError).message).toBe("Invalid client ID");
    });

    it("should handle API errors", async () => {
      const mockService = createMockGitHubService({
        listRepositories: () =>
          Effect.fail(
            new GitHubAPIError({ message: "Rate limit exceeded", status: 429 }),
          ),
      });
      const layer = Layer.succeed(GitHubService, mockService);

      const program = Effect.gen(function* () {
        const service = yield* GitHubService;
        return yield* service.listRepositories("mock-token");
      }).pipe(
        Effect.provide(layer),
        Effect.flip, // Convert error channel to success channel
      );

      const error = await Effect.runPromise(program);
      expect(error._tag).toBe("GitHubAPIError");
      expect((error as GitHubAPIError).message).toBe("Rate limit exceeded");
      expect((error as GitHubAPIError).status).toBe(429);
    });
  });

  describe("OAuth flow integration", () => {
    it("should complete full OAuth flow", async () => {
      let tokenPolled = false;
      const mockService = createMockGitHubService({
        initiateDeviceFlow: () =>
          Effect.succeed({
            deviceCode: "flow-device-code",
            userCode: "FLOW-5678",
            verificationUri: "https://github.com/login/device",
            expiresIn: 900,
            interval: 5,
          }),
        pollForToken: () => {
          tokenPolled = true;
          return Effect.succeed({
            accessToken: "flow-access-token",
            tokenType: "bearer",
            scope: "repo",
          });
        },
        listRepositories: () =>
          Effect.succeed([
            {
              name: "my-vault",
              owner: "testuser",
              fullName: "testuser/my-vault",
            },
          ]),
      });
      const layer = Layer.succeed(GitHubService, mockService);

      const program = Effect.gen(function* () {
        const service = yield* GitHubService;

        // Step 1: Initiate device flow
        const deviceCode = yield* service.initiateDeviceFlow("test-client");

        // Step 2: Poll for token (simulating user authorization)
        const token = yield* service.pollForToken(
          "test-client",
          deviceCode.deviceCode,
          deviceCode.interval,
        );

        // Step 3: List repositories
        const repos = yield* service.listRepositories(token.accessToken);

        return { deviceCode, token, repos };
      }).pipe(Effect.provide(layer));

      const result = await Effect.runPromise(program);

      expect(result.deviceCode.userCode).toBe("FLOW-5678");
      expect(tokenPolled).toBe(true);
      expect(result.token.accessToken).toBe("flow-access-token");
      expect(result.repos[0].fullName).toBe("testuser/my-vault");
    });
  });
});
