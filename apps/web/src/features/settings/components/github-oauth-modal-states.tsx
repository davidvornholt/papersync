'use client';

import { motion } from 'motion/react';
import { Button, Spinner } from '@/shared/components';
import {
  CopyButton,
  CountdownTimer,
  LoadingDots,
  SuccessCheckmark,
} from './github-oauth-modal-primitives';

export const OAuthLoadingState = (): React.ReactElement => (
  <motion.div
    key="loading"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex flex-col items-center gap-4 py-8"
  >
    <Spinner size="lg" />
    <p className="text-muted">Initiating connection...</p>
  </motion.div>
);

type OAuthAwaitingStateProps = {
  readonly userCode: string;
  readonly verificationUri: string;
  readonly expiresAt: Date;
  readonly onClose: () => void;
};

export const OAuthAwaitingState = ({
  userCode,
  verificationUri,
  expiresAt,
  onClose,
}: OAuthAwaitingStateProps): React.ReactElement => (
  <motion.div
    key="awaiting"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex flex-col items-center gap-6 w-full"
  >
    <div className="w-full">
      <div className="flex items-center gap-3 mb-3">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-accent text-white text-sm font-bold">
          1
        </span>
        <span className="font-medium text-foreground">Copy this code</span>
      </div>
      <div className="flex items-center justify-center gap-4 p-4 bg-surface rounded-xl border-2 border-dashed border-border">
        <motion.span
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="font-mono text-3xl font-bold tracking-widest text-accent"
        >
          {userCode}
        </motion.span>
        <CopyButton text={userCode} />
      </div>
    </div>

    <div className="w-full">
      <div className="flex items-center gap-3 mb-3">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-accent text-white text-sm font-bold">
          2
        </span>
        <span className="font-medium text-foreground">
          Open GitHub and enter the code
        </span>
      </div>
      <motion.a
        href={verificationUri}
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center justify-center gap-3 w-full p-4 bg-[#24292e] hover:bg-[#2f363d] text-white rounded-xl transition-colors"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <title>GitHub</title>
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
        <span className="font-medium">Open github.com/login/device</span>
      </motion.a>
    </div>

    <div className="flex flex-col items-center gap-2 pt-4">
      <div className="flex items-center gap-2 text-muted">
        <LoadingDots />
        <span>Waiting for authorization</span>
      </div>
      <div className="text-sm text-muted">
        Code expires in <CountdownTimer expiresAt={expiresAt} />
      </div>
    </div>

    <Button variant="ghost" onClick={onClose} className="mt-2">
      Cancel
    </Button>
  </motion.div>
);

export const OAuthSuccessState = (): React.ReactElement => (
  <motion.div
    key="success"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className="flex flex-col items-center gap-4 py-8"
  >
    <SuccessCheckmark />
    <div className="text-center">
      <h3 className="text-xl font-semibold text-foreground">Connected!</h3>
      <p className="text-muted mt-1">Your GitHub account has been linked.</p>
    </div>
  </motion.div>
);

type OAuthErrorStateProps = {
  readonly message: string;
  readonly onClose: () => void;
  readonly onRetry: () => void;
};

export const OAuthErrorState = ({
  message,
  onClose,
  onRetry,
}: OAuthErrorStateProps): React.ReactElement => (
  <motion.div
    key="error"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex flex-col items-center gap-4 py-8"
  >
    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
      <svg
        className="w-8 h-8 text-red-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <title>Error</title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    </div>
    <div className="text-center">
      <h3 className="text-xl font-semibold text-foreground">
        Connection Failed
      </h3>
      <p className="text-muted mt-1 max-w-xs">{message}</p>
    </div>
    <div className="flex gap-3 mt-4">
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={onRetry}>Try Again</Button>
    </div>
  </motion.div>
);
