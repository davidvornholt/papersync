'use client';

import { Button } from '@papersync/ui/button';
import { AnimatePresence, motion } from 'motion/react';
import { Spinner } from '@/shared/components/motion-loading';
import type { ExtractedEntry } from '@/shared/homework/entry';
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
  readonly canSave: boolean;
};

export const ResultsPanelComplete = ({
  entries,
  confidence,
  modelUsed,
  onUpdateEntry,
  onDeleteEntry,
  onSync,
  isSyncing,
  canSave,
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
      <p className="mb-3 text-graphite text-sm">
        {entries.filter((entry) => entry.isTask).length} tasks will be queued
        for Super Productivity. Notes are shown for review and are not saved or
        imported.
      </p>
      {canSave ? null : (
        <p className="mb-3 text-sm">
          Enter the printed week and analyze again before saving.
        </p>
      )}
      <Button
        onClick={onSync}
        disabled={
          !(canSave && entries.some((entry) => entry.isTask)) ||
          isSyncing ||
          entries.some((entry) => entry.isTask && !entry.content.trim())
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
