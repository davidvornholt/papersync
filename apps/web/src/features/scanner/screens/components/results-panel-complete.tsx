'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Button, Spinner } from '@/shared/components';
import type { ExtractedEntry } from '../../hooks';
import { EditableEntryItem } from './editable-entry-item';

type ResultsPanelCompleteProps = {
  readonly entries: readonly ExtractedEntry[];
  readonly confidence: number;
  readonly modelUsed?: string;
  readonly onUpdateEntry: (
    id: string,
    updates: Partial<ExtractedEntry>,
  ) => void;
  readonly onDeleteEntry: (id: string) => void;
  readonly onSync: () => void;
  readonly isSyncing: boolean;
};

export const ResultsPanelComplete = ({
  entries,
  confidence,
  modelUsed,
  onUpdateEntry,
  onDeleteEntry,
  onSync,
  isSyncing,
}: ResultsPanelCompleteProps): React.ReactElement => (
  <motion.div
    key="results"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex-1 flex flex-col min-h-0"
  >
    <div className="p-4 bg-accent/10 rounded-lg border border-accent/20 mb-4">
      <p className="text-sm font-medium text-accent">
        ✓ {entries.length} entr{entries.length === 1 ? 'y' : 'ies'} extracted
      </p>
      <p className="text-xs text-muted mt-0.5">
        Confidence: {Math.round(confidence * 100)}%
        {modelUsed && ` · ${modelUsed}`}
      </p>
    </div>

    <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
      <AnimatePresence>
        {entries.map((entry, index) => (
          <EditableEntryItem
            key={entry.id}
            entry={entry}
            index={index}
            onUpdate={onUpdateEntry}
            onDelete={onDeleteEntry}
          />
        ))}
      </AnimatePresence>
    </div>

    <div className="pt-4 mt-4 border-t border-border">
      <Button
        onClick={onSync}
        disabled={entries.length === 0 || isSyncing}
        className="w-full"
      >
        {isSyncing ? (
          <>
            <Spinner size="sm" className="mr-2" />
            Syncing to Vault...
          </>
        ) : (
          'Sync to Vault'
        )}
      </Button>
    </div>
  </motion.div>
);
