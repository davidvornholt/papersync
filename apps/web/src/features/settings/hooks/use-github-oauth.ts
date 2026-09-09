'use client';
import { Effect, Fiber } from 'effect';
import { useEffect, useRef, useState } from 'react';
import { requestAction } from '@/shared/http/action';
import {
  initiateGitHubDeviceFlow,
  pollGitHubToken,
} from '../actions/github-oauth';
import type { OAuthState } from '../components/github-oauth-modal-types';

const minimumPollSeconds = 5;
const millisecondsPerSecond = 1000;
// biome-ignore lint/style/noProcessEnv lint/correctness/noProcessGlobal: Next.js statically replaces this exact public build-time expression in client bundles.
const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ?? '';

const authorize = (setState: (state: OAuthState) => void) =>
  Effect.gen(function* () {
    const device = yield* requestAction(() =>
      initiateGitHubDeviceFlow(clientId),
    );
    if (!device.success) {
      setState({ status: 'error', message: device.error });
      return;
    }
    const expiresAt = new Date(
      Date.now() + device.expiresIn * millisecondsPerSecond,
    );
    setState({
      status: 'awaiting-authorization',
      userCode: device.userCode,
      verificationUri: device.verificationUri,
      expiresAt,
    });
    let interval = Math.max(device.interval, minimumPollSeconds);
    while (Date.now() < expiresAt.getTime()) {
      yield* Effect.sleep(`${interval} seconds`);
      const result = yield* requestAction(() =>
        pollGitHubToken(clientId, device.deviceCode),
      );
      if (result.success) {
        setState({ status: 'success', accessToken: result.accessToken });
        return;
      }
      if (!result.shouldRetry) {
        setState({ status: 'error', message: result.error });
        return;
      }
      if (result.isSlowDown) {
        interval += minimumPollSeconds;
      }
    }
    setState({
      status: 'error',
      message: 'Authorization expired. Start again to get a new code.',
    });
  });

export const useGitHubOAuth = () => {
  const [oauthState, setOAuthState] = useState<OAuthState>({ status: 'idle' });
  const authorizationRef = useRef<Fiber.RuntimeFiber<void, never> | null>(null);
  const cancelOAuth = () => {
    if (authorizationRef.current) {
      Effect.runFork(Fiber.interrupt(authorizationRef.current));
    }
    setOAuthState({ status: 'idle' });
  };
  useEffect(
    () => () => {
      if (authorizationRef.current) {
        Effect.runFork(Fiber.interrupt(authorizationRef.current));
      }
    },
    [],
  );
  const startOAuth = () => {
    cancelOAuth();
    if (!clientId) {
      setOAuthState({
        status: 'error',
        message:
          'GitHub vault connections are not configured on this deployment.',
      });
      return;
    }
    setOAuthState({ status: 'loading' });
    authorizationRef.current = Effect.runFork(
      authorize(setOAuthState).pipe(
        Effect.catchAll((error) =>
          Effect.sync(() =>
            setOAuthState({ status: 'error', message: error.message }),
          ),
        ),
      ),
    );
  };
  return {
    oauthState,
    startOAuth,
    cancelOAuth,
    reset: cancelOAuth,
    isConfigured: clientId.length > 0,
  };
};
