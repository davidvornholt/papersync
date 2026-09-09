'use client';

import { motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';

const pulseMinimumOpacity = 0.3;
const staggerSeconds = 0.2;
const feedbackMilliseconds = 2000;
const millisecondsPerSecond = 1000;
export const SuccessCheckmark = (): React.ReactElement => (
  <motion.svg
    initial={false}
    animate={{ scale: 1 }}
    transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
    className="size-14 text-positive"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <title>Success</title>
    <motion.circle
      initial={false}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.5 }}
      cx="12"
      cy="12"
      r="10"
      strokeWidth={1.5}
      className="stroke-positive/30"
    />
    <motion.path
      initial={false}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4"
    />
  </motion.svg>
);

export const LoadingDots = (): React.ReactElement => (
  <span className="inline-flex gap-1">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="size-1.5 rounded-full bg-accent"
        animate={{ opacity: [pulseMinimumOpacity, 1, pulseMinimumOpacity] }}
        transition={{
          duration: 1.2,
          repeat: Number.POSITIVE_INFINITY,
          delay: i * staggerSeconds,
        }}
      />
    ))}
  </span>
);

export const CopyButton = ({ text }: { text: string }): React.ReactElement => {
  const [copied, setCopied] = useState(false);

  const markCopied = useCallback(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), feedbackMilliseconds);
  }, []);

  const copyWithFallback = useCallback(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }, [text]);

  const handleCopy = useCallback(() => {
    if (!navigator.clipboard?.writeText) {
      copyWithFallback();
      markCopied();
      return;
    }

    navigator.clipboard
      .writeText(text)
      .then(markCopied)
      .catch(() => {
        copyWithFallback();
        markCopied();
      });
  }, [copyWithFallback, markCopied, text]);

  const renderCopiedIcon = (
    <svg
      className="size-4"
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
  );

  const renderCopyIcon = (
    <svg
      className="size-4"
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
  );

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`mono cursor-pointer touch-manipulation border px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors ${
        copied
          ? 'border-positive text-positive'
          : 'border-hairline-strong text-graphite hover:border-ink hover:text-ink'
      }`}
      aria-live="polite"
    >
      <span className="flex items-center gap-2">
        {copied ? (
          <>
            {renderCopiedIcon}
            Copied
          </>
        ) : (
          <>
            {renderCopyIcon}
            Copy code
          </>
        )}
      </span>
    </button>
  );
};

export const CountdownTimer = ({
  expiresAt,
}: {
  readonly expiresAt: Date;
}): React.ReactElement => {
  const [timeLeft, setTimeLeft] = useState<number>(
    Math.max(
      0,
      Math.floor((expiresAt.getTime() - Date.now()) / millisecondsPerSecond),
    ),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((expiresAt.getTime() - Date.now()) / millisecondsPerSecond),
      );
      setTimeLeft(remaining);
    }, millisecondsPerSecond);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <span className={`mono ${timeLeft < 60 ? 'text-accent' : 'text-graphite'}`}>
      {minutes}:{seconds.toString().padStart(2, '0')}
    </span>
  );
};
