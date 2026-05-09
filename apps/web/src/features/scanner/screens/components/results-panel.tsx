'use client';

import { Card, CardContent } from '@papersync/ui/card';
import { AnimatePresence } from 'motion/react';
import type { ExtractedEntry } from '../../hooks/use-scan';
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
  readonly entries: readonly ExtractedEntry[];
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
  <Card className="h-full flex flex-col min-h-[360px] sm:min-h-[420px]">
    <CardContent className="flex-1 flex flex-col min-h-0">
      <AnimatePresence mode="wait">
        {state === 'complete' && entries.length > 0 && (
          <ResultsPanelComplete
            entries={entries}
            confidence={confidence}
            modelUsed={modelUsed}
            onUpdateEntry={onUpdateEntry}
            onDeleteEntry={onDeleteEntry}
            onSync={onSync}
            isSyncing={isSyncing}
          />
        )}

        {state === 'complete' && entries.length === 0 && <ResultsEmptyState />}
        {state === 'processing' && <ResultsProcessingState />}
        {(state === 'idle' || state === 'uploading') && <ResultsIdleState />}
        {state === 'error' && (
          <ResultsErrorState
            message={errorMessage ?? 'An unexpected error occurred'}
          />
        )}
      </AnimatePresence>
    </CardContent>
  </Card>
);
