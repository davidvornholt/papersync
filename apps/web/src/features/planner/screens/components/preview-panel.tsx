'use client';

import { AnimatePresence, motion } from 'motion/react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Spinner,
} from '@/shared/components';
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
      <h2 className="text-lg font-semibold font-display">Preview</h2>
    </CardHeader>
    <CardContent className="flex items-center justify-center min-h-[400px]">
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
      <p className="font-medium text-foreground">Generating PDF...</p>
      <p className="text-sm text-muted mt-1">Creating your weekly planner</p>
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
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0 }}
    className="text-center space-y-6"
  >
    <div className="w-20 h-20 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
      <svg
        className="w-10 h-10 text-accent"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <title>Success</title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
    </div>
    <div>
      <p className="font-semibold text-lg text-foreground">PDF Generated!</p>
      <p className="text-sm text-muted mt-1">
        Your planner for {weekId} is ready
      </p>
    </div>
    <div className="flex gap-3">
      <Button onClick={onOpen} variant="secondary" size="lg">
        Open
      </Button>
      <Button onClick={onDownload} size="lg">
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
    <div className="w-48 h-64 mx-auto border-2 border-dashed border-border rounded-lg flex items-center justify-center mb-4 hover:border-accent/50 transition-colors">
      <svg
        className="w-12 h-12 text-muted-light"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <title>Document Preview</title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    </div>
    <p className="text-muted">Review schedule and generate your PDF</p>
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
    className="text-center space-y-4"
  >
    <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
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
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </div>
    <div>
      <p className="font-medium text-foreground">Generation Failed</p>
      <p className="text-sm text-muted mt-1">{errorMessage}</p>
    </div>
  </motion.div>
);
