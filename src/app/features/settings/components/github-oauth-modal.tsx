"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { Button, Modal, Spinner } from "@/app/shared/components";

// ============================================================================
// Types
// ============================================================================

export type OAuthState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "awaiting-authorization";
      userCode: string;
      verificationUri: string;
      expiresAt: Date;
    }
  | { status: "success"; accessToken: string }
  | { status: "error"; message: string };

type GitHubOAuthModalProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSuccess: (accessToken: string) => void;
  readonly oauthState: OAuthState;
  readonly onStartOAuth: () => void;
  readonly onCancel: () => void;
};

// ============================================================================
// Animated Check Icon
// ============================================================================

const SuccessCheckmark = (): React.ReactElement => (
  <motion.svg
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.1 }}
    className="w-16 h-16 text-green-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <title>Success</title>
    <motion.circle
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.5 }}
      cx="12"
      cy="12"
      r="10"
      strokeWidth={1.5}
      className="stroke-green-500/30"
    />
    <motion.path
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4"
    />
  </motion.svg>
);

// ============================================================================
// Loading Dots Animation
// ============================================================================

const LoadingDots = (): React.ReactElement => (
  <span className="inline-flex gap-1">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="w-1.5 h-1.5 bg-accent rounded-full"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{
          duration: 1.2,
          repeat: Number.POSITIVE_INFINITY,
          delay: i * 0.2,
        }}
      />
    ))}
  </span>
);

// ============================================================================
// Copy Button with Feedback
// ============================================================================

const CopyButton = ({ text }: { text: string }): React.ReactElement => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <motion.button
      type="button"
      onClick={handleCopy}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
        copied
          ? "bg-green-500 text-white"
          : "bg-surface hover:bg-border text-foreground"
      }`}
    >
      <span className="flex items-center gap-2">
        {copied ? (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>Copied</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>Copy</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
              />
            </svg>
            Copy Code
          </>
        )}
      </span>
    </motion.button>
  );
};

// ============================================================================
// Countdown Timer
// ============================================================================

const CountdownTimer = ({
  expiresAt,
}: {
  expiresAt: Date;
}): React.ReactElement => {
  const [timeLeft, setTimeLeft] = useState<number>(
    Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((expiresAt.getTime() - Date.now()) / 1000),
      );
      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <span
      className={`font-mono ${timeLeft < 60 ? "text-red-500" : "text-muted"}`}
    >
      {minutes}:{seconds.toString().padStart(2, "0")}
    </span>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const GitHubOAuthModal = ({
  isOpen,
  onClose,
  onSuccess,
  oauthState,
  onStartOAuth,
  onCancel,
}: GitHubOAuthModalProps): React.ReactElement => {
  // Auto-close on success after a delay
  useEffect(() => {
    if (oauthState.status === "success") {
      const timer = setTimeout(() => {
        onSuccess(oauthState.accessToken);
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [oauthState, onSuccess, onClose]);

  // Start OAuth flow when modal opens
  useEffect(() => {
    if (isOpen && oauthState.status === "idle") {
      onStartOAuth();
    }
  }, [isOpen, oauthState.status, onStartOAuth]);

  const handleClose = useCallback(() => {
    if (
      oauthState.status === "awaiting-authorization" ||
      oauthState.status === "loading"
    ) {
      onCancel();
    }
    onClose();
  }, [oauthState.status, onCancel, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Connect to GitHub"
      description="Authorize PaperSync to access your vault repository"
      size="md"
      closeOnOverlayClick={oauthState.status !== "loading"}
    >
      <div className="flex flex-col items-center py-4">
        <AnimatePresence mode="wait">
          {/* Loading State */}
          {oauthState.status === "loading" && (
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
          )}

          {/* Awaiting Authorization */}
          {oauthState.status === "awaiting-authorization" && (
            <motion.div
              key="awaiting"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-6 w-full"
            >
              {/* Step 1 */}
              <div className="w-full">
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-accent text-white text-sm font-bold">
                    1
                  </span>
                  <span className="font-medium text-foreground">
                    Copy this code
                  </span>
                </div>
                <div className="flex items-center justify-center gap-4 p-4 bg-surface rounded-xl border-2 border-dashed border-border">
                  <motion.span
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="font-mono text-3xl font-bold tracking-widest text-accent"
                  >
                    {oauthState.userCode}
                  </motion.span>
                  <CopyButton text={oauthState.userCode} />
                </div>
              </div>

              {/* Step 2 */}
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
                  href={oauthState.verificationUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center gap-3 w-full p-4 bg-[#24292e] hover:bg-[#2f363d] text-white rounded-xl transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <title>GitHub</title>
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span className="font-medium">
                    Open github.com/login/device
                  </span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>External Link</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </motion.a>
              </div>

              {/* Waiting indicator */}
              <div className="flex flex-col items-center gap-2 pt-4">
                <div className="flex items-center gap-2 text-muted">
                  <LoadingDots />
                  <span>Waiting for authorization</span>
                </div>
                <div className="text-sm text-muted">
                  Code expires in{" "}
                  <CountdownTimer expiresAt={oauthState.expiresAt} />
                </div>
              </div>

              {/* Cancel button */}
              <Button variant="ghost" onClick={handleClose} className="mt-2">
                Cancel
              </Button>
            </motion.div>
          )}

          {/* Success State */}
          {oauthState.status === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-4 py-8"
            >
              <SuccessCheckmark />
              <div className="text-center">
                <h3 className="text-xl font-semibold text-foreground">
                  Connected!
                </h3>
                <p className="text-muted mt-1">
                  Your GitHub account has been linked.
                </p>
              </div>
            </motion.div>
          )}

          {/* Error State */}
          {oauthState.status === "error" && (
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
                <p className="text-muted mt-1 max-w-xs">{oauthState.message}</p>
              </div>
              <div className="flex gap-3 mt-4">
                <Button variant="secondary" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={onStartOAuth}>Try Again</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
};
