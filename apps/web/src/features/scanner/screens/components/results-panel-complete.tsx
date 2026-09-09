'use client';

import { Button } from '@papersync/ui/button';
import { AnimatePresence, motion } from 'motion/react';
import type { ExtractedEntry } from '@/features/scanner/hooks/use-scan-types';
import { Spinner } from '@/shared/components/motion-loading';
import { EditableEntryItem } from './editable-entry-item';

const percentageScale = 100;
type ResultsPanelCompleteProps = {
  readonly entries: ReadonlyArray<ExtractedEntry>;
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
    initial={false}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex min-h-0 flex-1 flex-col"
  >
    <div className="mb-4 flex flex-col gap-1 border-hairline border-b pb-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <p className="serif text-[18px] text-ink">
        {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}
        <span className="serif-italic ink"> read</span>
      </p>
      <p className="mono text-[11px] text-graphite uppercase tracking-[0.18em]">
        {Math.round(confidence * percentageScale)}% confidence
        {modelUsed ? ` · ${modelUsed}` : null}
      </p>
    </div>

    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
      <AnimatePresence>
        {entries.map((entry) => (
          <EditableEntryItem
            key={entry.id}
            entry={entry}
            onUpdate={onUpdateEntry}
            onDelete={onDeleteEntry}
          />
        ))}
      </AnimatePresence>
    </div>

    <div className="mt-4 border-hairline border-t pt-4">
      <Button
        onClick={onSync}
        disabled={
          entries.length === 0 ||
          isSyncing ||
          entries.some((entry) => !entry.content.trim())
        }
        className="w-full"
      >
        {isSyncing ? (
          <>
            <Spinner size="sm" className="mr-2" />
            Saving homework...
          </>
        ) : (
          'Approve and save'
        )}
      </Button>
    </div>
  </motion.div>
);
