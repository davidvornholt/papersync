'use client';

import { Button } from '@papersync/ui/button';
import { motion } from 'motion/react';
import { Spinner } from '@/shared/components/motion';
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
    <p className="text-[13px] text-graphite">Initiating connection…</p>
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
        <span className="mono text-[11px] uppercase tracking-[0.18em] text-graphite">
          Step 01
        </span>
        <span className="serif text-[15px] text-ink">Copy this code</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 px-4 py-5 bg-paper-deep border border-dashed border-hairline-strong">
        <motion.span
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mono text-[24px] sm:text-[28px] font-medium tracking-[0.2em] text-accent"
        >
          {userCode}
        </motion.span>
        <CopyButton text={userCode} />
      </div>
    </div>

    <div className="w-full">
      <div className="flex items-center gap-3 mb-3">
        <span className="mono text-[11px] uppercase tracking-[0.18em] text-graphite">
          Step 02
        </span>
        <span className="serif text-[15px] text-ink">
          Open GitHub and enter the code
        </span>
      </div>
      <Button asChild className="w-full">
        <a href={verificationUri} target="_blank" rel="noopener noreferrer">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <title>GitHub</title>
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          <span>Open github.com/login/device</span>
        </a>
      </Button>
    </div>

    <div className="flex flex-col items-center gap-2 pt-4">
      <div className="flex items-center gap-2 text-graphite">
        <LoadingDots />
        <span className="text-[13px]">Waiting for authorization</span>
      </div>
      <div className="text-[13px] text-graphite">
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
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="flex flex-col items-center gap-4 py-8 text-center"
  >
    <SuccessCheckmark />
    <div>
      <h3 className="serif text-[22px] tracking-[-0.025em] text-ink">
        Connected
      </h3>
      <p className="text-[13px] text-graphite mt-1">
        Your GitHub account has been linked.
      </p>
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
    className="flex flex-col items-center gap-4 py-8 text-center px-4"
  >
    <div className="w-14 h-14 rounded-full bg-accent-soft/60 flex items-center justify-center">
      <svg
        className="w-7 h-7 text-accent"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <title>Error</title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.6}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    </div>
    <div>
      <h3 className="serif text-[20px] tracking-[-0.025em] text-ink">
        Connection failed
      </h3>
      <p className="text-[13px] text-graphite mt-1 max-w-xs">{message}</p>
    </div>
    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 mt-2 w-full sm:w-auto">
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={onRetry}>Try again</Button>
    </div>
  </motion.div>
);
