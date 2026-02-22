'use client';

import { Effect } from 'effect';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  initiateGitHubDeviceFlow,
  pollGitHubToken,
} from '../actions/github-oauth';
import type { OAuthState } from '../components/github-oauth-modal-types';

// ============================================================================
// Configuration
// ============================================================================

// GitHub OAuth App Client ID - this should be configured per deployment
// For development, you can create your own OAuth App at:
// https://github.com/settings/developers
const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ?? '';

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
  const [oauthState, setOAuthState] = useState<OAuthState>({ status: 'idle' });
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

    const poll = (): void => {
      if (!isPollingRef.current) {
        return;
      }

      const program = Effect.tryPromise({
        try: () => pollGitHubToken(GITHUB_CLIENT_ID, pollingConfig.deviceCode),
        catch: () => new Error('Failed to poll GitHub token'),
      }).pipe(
        Effect.match({
          onFailure: (error) => {
            if (!isPollingRef.current) {
              return;
            }
            setPollingConfig(null);
            setOAuthState({ status: 'error', message: error.message });
          },
          onSuccess: (result) => {
            if (!isPollingRef.current) {
              return;
            }
            if (result.success) {
              setPollingConfig(null);
              setOAuthState({
                status: 'success',
                accessToken: result.accessToken,
              });
              return;
            }
            if (!result.shouldRetry) {
              setPollingConfig(null);
              setOAuthState({ status: 'error', message: result.error });
              return;
            }
            const pollInterval = Math.max(pollingConfig.interval, 5) * 1000;
            timeoutId = setTimeout(poll, pollInterval);
          },
        }),
      );

      void Effect.runPromise(program);
    };

    // Start first poll after the interval
    const pollInterval = Math.max(pollingConfig.interval, 5) * 1000;
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
    setOAuthState({ status: 'idle' });
  }, []);

  const startOAuth = useCallback(() => {
    if (!isConfigured) {
      setOAuthState({
        status: 'error',
        message:
          'GitHub OAuth is not configured. Please set NEXT_PUBLIC_GITHUB_CLIENT_ID.',
      });
      return;
    }

    // Cancel any existing OAuth flow
    cancelOAuth();
    setOAuthState({ status: 'loading' });

    const program = Effect.tryPromise({
      try: () => initiateGitHubDeviceFlow(GITHUB_CLIENT_ID),
      catch: () => new Error('Failed to start GitHub OAuth'),
    }).pipe(
      Effect.match({
        onFailure: (error) => {
          setOAuthState({ status: 'error', message: error.message });
        },
        onSuccess: (result) => {
          if (!result.success) {
            setOAuthState({
              status: 'error',
              message: result.error,
            });
            return;
          }

          const expiresAt = new Date(Date.now() + result.expiresIn * 1000);
          setOAuthState({
            status: 'awaiting-authorization',
            userCode: result.userCode,
            verificationUri: result.verificationUri,
            expiresAt,
          });
          setPollingConfig({
            deviceCode: result.deviceCode,
            interval: result.interval,
          });
        },
      }),
    );

    void Effect.runPromise(program);
  }, [isConfigured, cancelOAuth]);

  const reset = useCallback(() => {
    cancelOAuth();
    setOAuthState({ status: 'idle' });
  }, [cancelOAuth]);

  return {
    oauthState,
    startOAuth,
    cancelOAuth,
    reset,
    isConfigured,
  };
};
