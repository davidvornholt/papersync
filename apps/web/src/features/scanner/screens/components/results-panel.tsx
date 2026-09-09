'use client';

import { Card, CardContent } from '@papersync/ui/card';
import { AnimatePresence } from 'motion/react';
import type { ExtractedEntry } from '@/features/scanner/hooks/use-scan-types';
import type { ResultsPanelState } from '../scan-screen-types';
import { ResultsPanelComplete } from './results-panel-complete';
import {
  ResultsEmptyState,
  ResultsErrorState,
  ResultsIdleState,
  ResultsProcessingState,
} from './results-panel-states';

type ResultsPanelProps = {
  readonly state: ResultsPanelState;
  readonly entries: ReadonlyArray<ExtractedEntry>;
  readonly confidence: number;
  readonly modelUsed?: string;
  readonly errorMessage?: string;
  readonly onUpdateEntry: (
    id: string,
    updates: Partial<ExtractedEntry>,
  ) => void;
  readonly onDeleteEntry: (id: string) => void;
  readonly onSync: () => void;
  readonly isSyncing: boolean;
};

export const ResultsPanel = ({
  state,
  entries,
  confidence,
  modelUsed,
  errorMessage,
  onUpdateEntry,
  onDeleteEntry,
  onSync,
  isSyncing,
}: ResultsPanelProps): React.ReactElement => (
  <Card className="flex h-full min-h-[360px] flex-col sm:min-h-[420px]">
    <CardContent className="flex min-h-0 flex-1 flex-col">
      <AnimatePresence mode="wait">
        {state === 'complete' && entries.length > 0 ? (
          <ResultsPanelComplete
            entries={entries}
            confidence={confidence}
            modelUsed={modelUsed}
            onUpdateEntry={onUpdateEntry}
            onDeleteEntry={onDeleteEntry}
            onSync={onSync}
            isSyncing={isSyncing}
          />
        ) : null}

        {state === 'complete' && entries.length === 0 ? (
          <ResultsEmptyState />
        ) : null}
        {state === 'processing' ? <ResultsProcessingState /> : null}
        {state === 'idle' || state === 'uploading' ? (
          <ResultsIdleState />
        ) : null}
        {state === 'error' ? (
          <ResultsErrorState
            message={errorMessage ?? 'An unexpected error occurred'}
          />
        ) : null}
      </AnimatePresence>
    </CardContent>
  </Card>
);
