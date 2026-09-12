'use client';

import { Checkbox } from '@papersync/ui/checkbox';
import { Select } from '@papersync/ui/select';
import type { ExtractedEntry } from '@/shared/homework/entry';
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
      <label htmlFor={`${entry.id}-day`} className="text-sm">
        Written on
        <Select
          id={`${entry.id}-day`}
          value={entry.day}
          onChange={(event) => onUpdate(entry.id, { day: event.target.value })}
          className="mt-1 w-full border border-hairline bg-paper p-2"
        >
          {SCAN_DAY_OPTIONS.map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </Select>
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
      <label htmlFor={`${entry.id}-type`} className="flex items-center gap-2">
        Entry type
        <Select
          id={`${entry.id}-type`}
          value={entry.isTask ? 'task' : 'note'}
          onChange={(event) =>
            onUpdate(entry.id, { isTask: event.target.value === 'task' })
          }
        >
          <option value="task">Task</option>
          <option value="note">Note</option>
        </Select>
      </label>
      <label
        htmlFor={`${entry.id}-completed`}
        className="flex items-center gap-2"
      >
        <Checkbox
          id={`${entry.id}-completed`}
          checked={entry.isCompleted}
          onChange={(event) =>
            onUpdate(entry.id, { isCompleted: event.target.checked })
          }
        />
        Completed on paper
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
