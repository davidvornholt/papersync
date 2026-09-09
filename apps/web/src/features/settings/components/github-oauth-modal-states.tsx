'use client';

import { Button } from '@papersync/ui/button';
import { motion } from 'motion/react';
import { Spinner } from '@/shared/components/motion-loading';
import {
  CopyButton,
  CountdownTimer,
  LoadingDots,
  SuccessCheckmark,
} from './github-oauth-modal-primitives';
export const OAuthLoadingState = (): React.ReactElement => (
  <motion.div
    key="loading"
    initial={false}
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
    initial={false}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex w-full flex-col items-center gap-6"
  >
    <div className="w-full">
      <div className="mb-3 flex items-center gap-3">
        <span className="mono text-[11px] text-graphite uppercase tracking-[0.18em]">
          Step 01
        </span>
        <span className="serif text-[15px] text-ink">Copy this code</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 border border-hairline-strong border-dashed bg-paper-deep px-4 py-5 sm:gap-4">
        <motion.span
          initial={false}
          animate={{ scale: 1, opacity: 1 }}
          className="mono font-medium text-[24px] text-accent tracking-[0.2em] sm:text-[28px]"
        >
          {userCode}
        </motion.span>
        <CopyButton text={userCode} />
      </div>
    </div>

    <div className="w-full">
      <div className="mb-3 flex items-center gap-3">
        <span className="mono text-[11px] text-graphite uppercase tracking-[0.18em]">
          Step 02
        </span>
        <span className="serif text-[15px] text-ink">
          Open GitHub and enter the code
        </span>
      </div>
      <Button asChild={true} className="w-full">
        <a href={verificationUri} target="_blank" rel="noopener noreferrer">
          <svg className="size-5" fill="currentColor" viewBox="0 0 24 24">
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
    initial={false}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="flex flex-col items-center gap-4 py-8 text-center"
  >
    <SuccessCheckmark />
    <div>
      <h3 className="serif text-[22px] text-ink tracking-[-0.025em]">
        Connected
      </h3>
      <p className="mt-1 text-[13px] text-graphite">
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
    initial={false}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex flex-col items-center gap-4 px-4 py-8 text-center"
  >
    <div className="flex size-14 items-center justify-center rounded-full bg-accent-soft/60">
      <svg
        className="size-7 text-accent"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden={true}
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
      <h3 className="serif text-[20px] text-ink tracking-[-0.025em]">
        Connection failed
      </h3>
      <p className="mt-1 max-w-xs text-[13px] text-graphite">{message}</p>
    </div>
    <div className="mt-2 flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:gap-3">
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={onRetry}>Try again</Button>
    </div>
  </motion.div>
);
