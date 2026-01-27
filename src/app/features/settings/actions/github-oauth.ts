"use server";

/**
 * Server Actions for GitHub OAuth Device Flow
 *
 * GitHub's OAuth endpoints don't support CORS, so they must be called
 * from the server-side rather than directly from the browser.
 */

// ============================================================================
// Types
// ============================================================================

export type DeviceCodeResult =
  | {
      success: true;
      deviceCode: string;
      userCode: string;
      verificationUri: string;
      expiresIn: number;
      interval: number;
    }
  | {
      success: false;
      error: string;
    };

export type TokenPollResult =
  | {
      success: true;
      accessToken: string;
      tokenType: string;
      scope: string;
    }
  | {
      success: false;
      error: string;
      shouldRetry?: boolean;
    };

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Initiate GitHub Device Flow from the server
 * This bypasses CORS restrictions since it runs on the server
 */
export async function initiateGitHubDeviceFlow(
  clientId: string,
): Promise<DeviceCodeResult> {
  try {
    const response = await fetch("https://github.com/login/device/code", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        scope: "repo",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("GitHub device flow error:", response.status, errorText);
      return {
        success: false,
        error: `GitHub returned ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();

    if (data.error) {
      return {
        success: false,
        error: data.error_description || data.error,
      };
    }

    return {
      success: true,
      deviceCode: data.device_code,
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      expiresIn: data.expires_in,
      interval: data.interval,
    };
  } catch (error) {
    console.error("Failed to initiate device flow:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Poll for OAuth token from the server
 * This should be called periodically after the user authorizes
 */
export async function pollGitHubToken(
  clientId: string,
  deviceCode: string,
): Promise<TokenPollResult> {
  console.log("[Server] Polling for GitHub token...");
  try {
    const response = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          device_code: deviceCode,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        }),
      },
    );

    if (!response.ok) {
      return {
        success: false,
        error: `GitHub returned ${response.status}`,
        shouldRetry: false,
      };
    }

    const data = await response.json();

    // Handle pending states
    if (data.error === "authorization_pending") {
      return {
        success: false,
        error: "Authorization pending",
        shouldRetry: true,
      };
    }

    if (data.error === "slow_down") {
      return {
        success: false,
        error: "Slow down - polling too fast",
        shouldRetry: true,
      };
    }

    if (data.error) {
      return {
        success: false,
        error: data.error_description || data.error,
        shouldRetry: false,
      };
    }

    if (!data.access_token) {
      return {
        success: false,
        error: "No access token in response",
        shouldRetry: false,
      };
    }

    return {
      success: true,
      accessToken: data.access_token,
      tokenType: data.token_type,
      scope: data.scope,
    };
  } catch (error) {
    console.error("Failed to poll for token:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      shouldRetry: true,
    };
  }
}

// ============================================================================
// GitHub User Info
// ============================================================================

export type GitHubUserResult =
  | {
      success: true;
      login: string;
      name: string | null;
      avatarUrl: string;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Fetch GitHub user info using the access token
 */
export async function getGitHubUser(
  accessToken: string,
): Promise<GitHubUserResult> {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `GitHub API returned ${response.status}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      login: data.login,
      name: data.name,
      avatarUrl: data.avatar_url,
    };
  } catch (error) {
    console.error("Failed to fetch GitHub user:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// ============================================================================
// GitHub Repositories
// ============================================================================

export type GitHubRepository = {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  description: string | null;
};

export type GitHubReposResult =
  | {
      success: true;
      repositories: GitHubRepository[];
    }
  | {
      success: false;
      error: string;
    };

/**
 * List GitHub repositories the user has access to
 */
export async function listGitHubRepositories(
  accessToken: string,
): Promise<GitHubReposResult> {
  try {
    const response = await fetch(
      "https://api.github.com/user/repos?sort=updated&per_page=100",
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${accessToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    if (!response.ok) {
      return {
        success: false,
        error: `GitHub API returned ${response.status}`,
      };
    }

    const data = await response.json();

    const repositories: GitHubRepository[] = data.map(
      (repo: {
        id: number;
        name: string;
        full_name: string;
        owner: { login: string };
        private: boolean;
        description: string | null;
      }) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        private: repo.private,
        description: repo.description,
      }),
    );

    return {
      success: true,
      repositories,
    };
  } catch (error) {
    console.error("Failed to list GitHub repositories:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
