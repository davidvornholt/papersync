'use client';

import { Button } from '@papersync/ui/button';
import { Card, CardContent, CardHeader } from '@papersync/ui/card';
import { AnimatePresence, motion } from 'motion/react';
import { Spinner } from '@/shared/components/motion-loading';
import type { PreviewPanelState } from '../planner-screen-types';

type PreviewPanelProps = {
  readonly state: PreviewPanelState;
  readonly onDownload: () => void;
  readonly onOpen: () => void;
  readonly weekId: string;
  readonly errorMessage?: string;
};

export const PreviewPanel = ({
  state,
  onDownload,
  onOpen,
  weekId,
  errorMessage,
}: PreviewPanelProps): React.ReactElement => (
  <Card className="h-full">
    <CardHeader>
      <h2 className="serif text-[20px] text-ink tracking-[-0.022em]">
        Preview
      </h2>
    </CardHeader>
    <CardContent className="flex min-h-[320px] items-center justify-center sm:min-h-[400px]">
      <AnimatePresence mode="wait">
        {state === 'generating' ? <PreviewGeneratingState /> : null}
        {state === 'generated' ? (
          <PreviewGeneratedState
            weekId={weekId}
            onDownload={onDownload}
            onOpen={onOpen}
          />
        ) : null}
        {state === 'configure' ? <PreviewConfigureState /> : null}
        {state === 'error' ? (
          <PreviewErrorState
            errorMessage={errorMessage ?? 'An unexpected error occurred'}
          />
        ) : null}
      </AnimatePresence>
    </CardContent>
  </Card>
);

const PreviewGeneratingState = (): React.ReactElement => (
  <motion.div
    key="generating"
    initial={false}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="space-y-4 text-center"
  >
    <div className="mx-auto flex size-16 items-center justify-center">
      <Spinner size="lg" />
    </div>
    <div>
      <p className="serif text-[18px] text-ink">Generating PDF…</p>
      <p className="mt-1 text-[13px] text-graphite">
        Setting your weekly planner
      </p>
    </div>
  </motion.div>
);

type PreviewGeneratedStateProps = {
  readonly weekId: string;
  readonly onDownload: () => void;
  readonly onOpen: () => void;
};

const PreviewGeneratedState = ({
  weekId,
  onDownload,
  onOpen,
}: PreviewGeneratedStateProps): React.ReactElement => (
  <motion.div
    key="generated"
    initial={false}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0 }}
    className="mx-auto w-full max-w-xs space-y-6 text-center"
  >
    <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent-soft">
      <svg
        className="size-8 text-accent"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <title>Success</title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.6}
          d="M5 13l4 4L19 7"
        />
      </svg>
    </div>
    <div>
      <p className="serif text-[22px] text-ink tracking-[-0.022em]">
        PDF generated
      </p>
      <p className="mt-1 text-[13px] text-graphite">
        Your planner for <span className="mono text-[12px]">{weekId}</span> is
        ready
      </p>
    </div>
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
      <Button
        onClick={onOpen}
        variant="secondary"
        size="lg"
        className="sm:flex-1"
      >
        Open
      </Button>
      <Button onClick={onDownload} size="lg" className="sm:flex-1">
        Download
      </Button>
    </div>
  </motion.div>
);

const PreviewConfigureState = (): React.ReactElement => (
  <motion.div
    key="configure"
    initial={false}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="text-center"
  >
    <div className="mx-auto mb-4 flex h-56 w-40 items-center justify-center border border-hairline-strong border-dashed transition-colors hover:border-accent/60 sm:h-64 sm:w-48">
      <svg
        className="size-10 text-graphite sm:size-12"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <title>Document preview</title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.4}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    </div>
    <p className="text-[13px] text-graphite">
      Review the schedule, then generate your PDF
    </p>
  </motion.div>
);

const PreviewErrorState = ({
  errorMessage,
}: {
  readonly errorMessage: string;
}): React.ReactElement => (
  <motion.div
    key="error"
    initial={false}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="mx-auto max-w-xs space-y-4 text-center"
  >
    <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent-soft/60">
      <svg
        className="size-7 text-accent"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <title>Error</title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.6}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </div>
    <div>
      <p className="serif text-[18px] text-ink">Generation failed</p>
      <p className="mt-1 text-[13px] text-graphite">{errorMessage}</p>
    </div>
  </motion.div>
);
