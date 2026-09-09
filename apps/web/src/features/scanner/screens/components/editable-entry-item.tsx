'use client';

import type { ExtractedEntry } from '@/features/scanner/hooks/use-scan-types';
import { SCAN_DAY_OPTIONS } from '../scan-screen-types';

type EditableEntryItemProps = {
  readonly entry: ExtractedEntry;
  readonly onUpdate: (id: string, updates: Partial<ExtractedEntry>) => void;
  readonly onDelete: (id: string) => void;
};

export const EditableEntryItem = ({
  entry,
  onUpdate,
  onDelete,
}: EditableEntryItemProps): React.ReactElement => (
  <fieldset className="space-y-3 border border-hairline bg-paper p-4">
    <legend className="px-1 text-graphite text-sm">
      {entry.subject || 'Homework'}
    </legend>
    <div className="grid grid-cols-2 gap-3">
      <label className="text-sm">
        Written on
        <select
          value={entry.day}
          onChange={(event) => onUpdate(entry.id, { day: event.target.value })}
          className="mt-1 w-full border border-hairline bg-paper p-2"
        >
          {SCAN_DAY_OPTIONS.map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Subject
        <input
          value={entry.subject}
          onChange={(event) =>
            onUpdate(entry.id, { subject: event.target.value })
          }
          className="mt-1 w-full border border-hairline bg-paper p-2"
        />
      </label>
    </div>
    <label className="block text-sm">
      Homework or note
      <textarea
        value={entry.content}
        onChange={(event) =>
          onUpdate(entry.id, { content: event.target.value })
        }
        rows={2}
        className="mt-1 w-full border border-hairline bg-paper p-2"
      />
    </label>
    <label className="block text-sm">
      Due date <span className="text-graphite">(optional)</span>
      <input
        type="date"
        value={entry.dueDate ?? ''}
        onChange={(event) =>
          onUpdate(entry.id, { dueDate: event.target.value || undefined })
        }
        className="mt-1 block w-full border border-hairline bg-paper p-2"
      />
    </label>
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={entry.isTask}
          onChange={(event) =>
            onUpdate(entry.id, { isTask: event.target.checked })
          }
        />
        Create a task
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={entry.isCompleted}
          onChange={(event) =>
            onUpdate(entry.id, { isCompleted: event.target.checked })
          }
        />
        Already done
      </label>
      <button
        type="button"
        onClick={() => onDelete(entry.id)}
        className="ml-auto min-h-10 underline"
        aria-label={`Remove entry: ${entry.content}`}
      >
        Remove
      </button>
    </div>
  </fieldset>
);
