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
  readonly notes?: string;
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
  notes,
  onUpdateEntry,
  onDeleteEntry,
  onSync,
  isSyncing,
  canSave,
}: ResultsPanelCompleteProps): React.ReactElement => {
  const reviewEntries = entries.filter((entry) => entry.action !== 'skip');
  const savedEntries = entries.filter((entry) => entry.action === 'skip');
  return (
    <motion.div
      key="results"
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="mb-4 flex flex-col gap-1 border-hairline border-b pb-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <p className="serif text-[18px] text-ink">
          {reviewEntries.length} new or changed entr
          {reviewEntries.length === 1 ? 'y' : 'ies'}
          <span className="serif-italic ink"> read</span>
        </p>
        <p className="mono text-[11px] text-graphite uppercase tracking-[0.18em]">
          {Math.round(confidence * percentageScale)}% confidence
          {modelUsed ? ` · ${modelUsed}` : null}
        </p>
      </div>

      {notes ? <p className="mb-4 text-graphite text-sm">{notes}</p> : null}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {reviewEntries.length === 0 ? (
          <p>All recognized homework is already saved.</p>
        ) : null}
        <AnimatePresence>
          {reviewEntries.map((entry) => (
            <EditableEntryItem
              key={entry.id}
              entry={entry}
              onUpdate={onUpdateEntry}
              onDelete={onDeleteEntry}
            />
          ))}
        </AnimatePresence>
        {savedEntries.length > 0 ? (
          <details className="border-hairline border-t pt-4">
            <summary className="cursor-pointer">
              {savedEntries.length} already saved — show entries
            </summary>
            <p className="mt-2 text-graphite text-sm">
              These entries match saved homework and will not be queued again.
              Review an entry to correct it.
            </p>
            <ul className="mt-3 space-y-3">
              {savedEntries.map((entry) => (
                <li key={entry.id} className="border border-hairline p-3">
                  <p className="text-graphite text-sm">
                    {entry.day} · {entry.subject}
                    {entry.isCompleted ? ' · Completed on paper' : ''}
                    {entry.dueDate ? ` · Due ${entry.dueDate}` : ''}
                  </p>
                  <p className="mt-1">{entry.content}</p>
                  <Button
                    className="mt-2"
                    onClick={() =>
                      onUpdateEntry(entry.id, { action: 'modify' })
                    }
                  >
                    Review entry
                  </Button>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>

      <div className="mt-4 border-hairline border-t pt-4">
        <p className="mb-3 text-graphite text-sm">
          {reviewEntries.length} new or changed tasks will be queued for Super
          Productivity. Remove any entries you do not want to import.
        </p>
        {canSave ? null : (
          <p className="mb-3 text-sm">
            Enter the printed week and choose “Use this week” before saving.
            Your entries will stay here.
          </p>
        )}
        <Button
          onClick={onSync}
          disabled={
            !(canSave && reviewEntries.length > 0) ||
            isSyncing ||
            reviewEntries.some((entry) => !entry.content.trim())
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
};
