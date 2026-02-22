'use client';

import { AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader } from '@/shared/components';
import type { ExtractedEntry } from '../../hooks';
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
  <Card elevated className="h-full flex flex-col">
    <CardHeader>
      <h2 className="text-lg font-semibold font-display">Extraction Results</h2>
    </CardHeader>
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
