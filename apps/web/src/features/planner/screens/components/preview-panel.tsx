'use client';

import { Button } from '@papersync/ui/button';
import { Card, CardContent, CardHeader } from '@papersync/ui/card';
import { AnimatePresence, motion } from 'motion/react';
import { Spinner } from '@/shared/components/motion';
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
  <Card elevated className="h-full">
    <CardHeader>
      <h2 className="serif text-[20px] tracking-[-0.022em] text-ink">
        Preview
      </h2>
    </CardHeader>
    <CardContent className="flex items-center justify-center min-h-[320px] sm:min-h-[400px]">
      <AnimatePresence mode="wait">
        {state === 'generating' && <PreviewGeneratingState />}
        {state === 'generated' && (
          <PreviewGeneratedState
            weekId={weekId}
            onDownload={onDownload}
            onOpen={onOpen}
          />
        )}
        {state === 'configure' && <PreviewConfigureState />}
        {state === 'error' && (
          <PreviewErrorState
            errorMessage={errorMessage ?? 'An unexpected error occurred'}
          />
        )}
      </AnimatePresence>
    </CardContent>
  </Card>
);

const PreviewGeneratingState = (): React.ReactElement => (
  <motion.div
    key="generating"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="text-center space-y-4"
  >
    <div className="w-16 h-16 mx-auto flex items-center justify-center">
      <Spinner size="lg" />
    </div>
    <div>
      <p className="serif text-[18px] text-ink">Generating PDF…</p>
      <p className="text-[13px] text-graphite mt-1">
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
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0 }}
    className="text-center space-y-6 w-full max-w-xs mx-auto"
  >
    <div className="w-16 h-16 mx-auto rounded-full bg-accent-soft flex items-center justify-center">
      <svg
        className="w-8 h-8 text-accent"
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
      <p className="serif text-[22px] tracking-[-0.022em] text-ink">
        PDF generated
      </p>
      <p className="text-[13px] text-graphite mt-1">
        Your planner for <span className="mono text-[12px]">{weekId}</span> is
        ready
      </p>
    </div>
    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
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
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="text-center"
  >
    <div className="w-40 h-56 sm:w-48 sm:h-64 mx-auto border border-dashed border-hairline-strong flex items-center justify-center mb-4 hover:border-accent/60 transition-colors">
      <svg
        className="w-10 h-10 sm:w-12 sm:h-12 text-graphite"
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
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="text-center space-y-4 max-w-xs mx-auto"
  >
    <div className="w-14 h-14 mx-auto rounded-full bg-accent-soft/60 flex items-center justify-center">
      <svg
        className="w-7 h-7 text-accent"
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
      <p className="text-[13px] text-graphite mt-1">{errorMessage}</p>
    </div>
  </motion.div>
);
