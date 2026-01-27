"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  initiateGitHubDeviceFlow,
  pollGitHubToken,
} from "../actions/github-oauth";
import type { OAuthState } from "../components/github-oauth-modal";

// ============================================================================
// Configuration
// ============================================================================

// GitHub OAuth App Client ID - this should be configured per deployment
// For development, you can create your own OAuth App at:
// https://github.com/settings/developers
const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ?? "";

// ============================================================================
// Hook
// ============================================================================

export type UseGitHubOAuthReturn = {
  readonly oauthState: OAuthState;
  readonly startOAuth: () => void;
  readonly cancelOAuth: () => void;
  readonly reset: () => void;
  readonly isConfigured: boolean;
};

export const useGitHubOAuth = (): UseGitHubOAuthReturn => {
  const [oauthState, setOAuthState] = useState<OAuthState>({ status: "idle" });
  const [pollingConfig, setPollingConfig] = useState<{
    deviceCode: string;
    interval: number;
  } | null>(null);

  const isPollingRef = useRef(false);
  const isConfigured = GITHUB_CLIENT_ID.length > 0;

  // Polling effect - uses setTimeout for reliable async polling
  useEffect(() => {
    if (!pollingConfig) {
      isPollingRef.current = false;
      return;
    }

    isPollingRef.current = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      if (!isPollingRef.current) return;

      console.log("[OAuth] Polling for token...");
      const result = await pollGitHubToken(
        GITHUB_CLIENT_ID,
        pollingConfig.deviceCode,
      );

      if (!isPollingRef.current) return;

      if (result.success) {
        console.log("[OAuth] Token received!");
        setPollingConfig(null); // Stop polling
        setOAuthState({
          status: "success",
          accessToken: result.accessToken,
        });
      } else if (!result.shouldRetry) {
        console.log("[OAuth] Fatal error:", result.error);
        setPollingConfig(null); // Stop polling
        setOAuthState({
          status: "error",
          message: result.error,
        });
      } else {
        // Keep polling - schedule next poll
        console.log("[OAuth] Still waiting, will retry...");
        const pollInterval = Math.max(pollingConfig.interval, 5) * 1000;
        timeoutId = setTimeout(poll, pollInterval);
      }
    };

    // Start first poll after the interval
    const pollInterval = Math.max(pollingConfig.interval, 5) * 1000;
    console.log(
      `[OAuth] Starting polling with interval: ${pollInterval / 1000}s`,
    );
    timeoutId = setTimeout(poll, pollInterval);

    return () => {
      isPollingRef.current = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [pollingConfig]);

  const cancelOAuth = useCallback(() => {
    isPollingRef.current = false;
    setPollingConfig(null);
    setOAuthState({ status: "idle" });
  }, []);

  const startOAuth = useCallback(async () => {
    if (!isConfigured) {
      setOAuthState({
        status: "error",
        message:
          "GitHub OAuth is not configured. Please set NEXT_PUBLIC_GITHUB_CLIENT_ID.",
      });
      return;
    }

    // Cancel any existing OAuth flow
    cancelOAuth();
    setOAuthState({ status: "loading" });

    console.log("[OAuth] Initiating device flow...");
    const result = await initiateGitHubDeviceFlow(GITHUB_CLIENT_ID);

    if (!result.success) {
      console.log("[OAuth] Device flow failed:", result.error);
      setOAuthState({
        status: "error",
        message: result.error,
      });
      return;
    }

    console.log("[OAuth] Device flow initiated, user code:", result.userCode);

    // Update state with device code info
    const expiresAt = new Date(Date.now() + result.expiresIn * 1000);

    setOAuthState({
      status: "awaiting-authorization",
      userCode: result.userCode,
      verificationUri: result.verificationUri,
      expiresAt,
    });

    // Start polling by setting the polling config
    setPollingConfig({
      deviceCode: result.deviceCode,
      interval: result.interval,
    });
  }, [isConfigured, cancelOAuth]);

  const reset = useCallback(() => {
    cancelOAuth();
    setOAuthState({ status: "idle" });
  }, [cancelOAuth]);

  return {
    oauthState,
    startOAuth,
    cancelOAuth,
    reset,
    isConfigured,
  };
};
