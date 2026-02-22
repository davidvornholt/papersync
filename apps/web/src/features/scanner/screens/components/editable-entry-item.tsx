'use client';

import { motion } from 'motion/react';
import { useState } from 'react';
import { Button } from '@/shared/components';
import type { ExtractedEntry } from '../../hooks';
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
      className="p-4 bg-background rounded-lg border border-border hover:border-accent/30 transition-colors group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {entry.subject !== 'General Tasks' && (
              <select
                value={entry.day}
                onChange={(e) => onUpdate(entry.id, { day: e.target.value })}
                className="text-xs font-medium px-2 py-1 rounded bg-surface border border-border text-muted"
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
              className="text-xs font-medium px-2 py-1 rounded bg-accent/10 text-accent border-0 min-w-0 w-24"
            />
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full text-sm text-foreground bg-surface border border-border rounded-lg p-2 resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    onUpdate(entry.id, { content: editContent });
                    setIsEditing(false);
                  }}
                >
                  Save
                </Button>
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
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="text-sm text-foreground cursor-pointer hover:text-accent transition-colors text-left w-full"
              onClick={() => setIsEditing(true)}
            >
              {entry.content}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => onDelete(entry.id)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-500 transition-all"
        >
          Delete
        </button>
      </div>
    </motion.div>
  );
};
