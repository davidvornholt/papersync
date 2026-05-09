'use client';

import { Button } from '@papersync/ui/button';
import { AnimatePresence, motion } from 'motion/react';
import { Spinner } from '@/shared/components/motion';
import type { ExtractedEntry } from '../../hooks/use-scan';
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
    <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-4 pb-4 mb-4 border-b border-hairline">
      <p className="serif text-[18px] text-ink">
        {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}
        <span className="serif-italic ink"> read</span>
      </p>
      <p className="mono text-[11px] uppercase tracking-[0.18em] text-graphite">
        {Math.round(confidence * 100)}% confidence
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

    <div className="pt-4 mt-4 border-t border-hairline">
      <Button
        onClick={onSync}
        disabled={entries.length === 0 || isSyncing}
        className="w-full"
      >
        {isSyncing ? (
          <>
            <Spinner size="sm" className="mr-2" />
            Syncing to vault...
          </>
        ) : (
          'Sync to vault'
        )}
      </Button>
    </div>
  </motion.div>
);
