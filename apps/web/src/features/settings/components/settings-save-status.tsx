'use client';

import { Check } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Spinner } from '@/shared/components/motion-loading';
import type { SaveStatus } from '@/shared/hooks/use-settings';
import { blur, distance, duration, ease } from '@/shared/motion/tokens';

type SettingsSaveStatusProps = {
  readonly status: SaveStatus;
  readonly onRetry: () => void;
};

const swap = {
  initial: { opacity: 0, y: distance.micro, filter: blur.small },
  animate: { opacity: 1, y: 0, filter: blur.none },
  exit: { opacity: 0, y: -distance.micro, filter: blur.small },
  transition: { duration: duration.quick, ease: ease.inOut },
} as const;

/** Sticky autosave indicator: changes persist as they happen. */
export const SettingsSaveStatus = ({
  status,
  onRetry,
}: SettingsSaveStatusProps): React.ReactElement => (
  <div
    role="status"
    aria-label="Save status"
    aria-live="polite"
    className="sticky bottom-0 z-10 mt-10 flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-hairline border-t bg-paper/90 py-2 backdrop-blur-sm"
  >
    <p className="text-[13px] text-graphite">
      Subjects and timetable sync across your browsers. AI settings stay in this
      browser.
    </p>
    <div className="mono flex min-w-32 shrink-0 items-center justify-end gap-2 text-[11px] uppercase tracking-[0.18em]">
      <AnimatePresence mode="wait" initial={false}>
        {status.kind === 'saving' ? (
          <motion.span
            key="saving"
            {...swap}
            className="flex items-center gap-2 text-graphite"
          >
            <Spinner size="sm" />
            Saving
          </motion.span>
        ) : null}
        {status.kind === 'saved' ? (
          <motion.span
            key="saved"
            {...swap}
            className="flex items-center gap-2 text-positive"
          >
            <Check size={14} aria-hidden={true} />
            Saved
          </motion.span>
        ) : null}
        {status.kind === 'error' ? (
          <motion.span
            key="error"
            {...swap}
            className="flex items-center gap-3 text-accent normal-case tracking-normal"
          >
            <span className="text-[13px]">{status.message}</span>
            <button
              type="button"
              onClick={onRetry}
              className="mono min-h-10 cursor-pointer text-[11px] text-ink uppercase tracking-[0.18em] underline underline-offset-4"
            >
              Retry
            </button>
          </motion.span>
        ) : null}
      </AnimatePresence>
    </div>
  </div>
);
