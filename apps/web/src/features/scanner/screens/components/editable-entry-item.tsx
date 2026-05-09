'use client';

import { Button } from '@papersync/ui/button';
import { motion } from 'motion/react';
import { useState } from 'react';
import type { ExtractedEntry } from '../../hooks/use-scan';
import { SCAN_DAY_OPTIONS } from '../scan-screen-types';

type EditableEntryItemProps = {
  readonly entry: ExtractedEntry;
  readonly index: number;
  readonly onUpdate: (id: string, updates: Partial<ExtractedEntry>) => void;
  readonly onDelete: (id: string) => void;
};

export const EditableEntryItem = ({
  entry,
  index,
  onUpdate,
  onDelete,
}: EditableEntryItemProps): React.ReactElement => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(entry.content);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 bg-paper border border-hairline hover:border-hairline-strong transition-colors"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {entry.subject !== 'General Tasks' && (
              <select
                value={entry.day}
                onChange={(e) => onUpdate(entry.id, { day: e.target.value })}
                className="mono text-[11px] uppercase tracking-[0.12em] px-2 py-1 bg-paper-deep border border-hairline text-graphite cursor-pointer"
              >
                {SCAN_DAY_OPTIONS.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            )}
            <input
              type="text"
              value={entry.subject}
              onChange={(e) => onUpdate(entry.id, { subject: e.target.value })}
              className="mono text-[11px] uppercase tracking-[0.12em] px-2 py-1 bg-accent-soft text-accent border-0 min-w-0 max-w-[10rem] flex-1 sm:flex-none sm:w-28"
            />
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full text-[14.5px] text-ink bg-paper border border-hairline-strong p-2 resize-none focus:outline-none focus:border-ink"
                rows={2}
              />
              <div className="flex flex-col-reverse sm:flex-row gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditContent(entry.content);
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    onUpdate(entry.id, { content: editContent });
                    setIsEditing(false);
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="text-[14.5px] text-ink cursor-pointer hover:text-accent transition-colors text-left w-full leading-relaxed"
              onClick={() => setIsEditing(true)}
            >
              {entry.content}
            </button>
          )}
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={() => onDelete(entry.id)}
            className="self-end sm:self-start mono text-[10px] uppercase tracking-[0.18em] text-graphite hover:text-accent transition-colors cursor-pointer touch-manipulation py-1"
            aria-label={`Delete entry: ${entry.content}`}
          >
            Delete
          </button>
        )}
      </div>
    </motion.div>
  );
};
