import { Button } from '@/shared/components';
import type { Subject } from '@/shared/types';

type ExceptionSlotEditorProps = {
  readonly slots: Array<{ id: string; subjectId: string }>;
  readonly subjects: readonly Subject[];
  readonly onAddSlot: () => void;
  readonly onChangeSlot: (slotId: string, subjectId: string) => void;
  readonly onRemoveSlot: (slotId: string) => void;
};

export const ExceptionSlotEditor = ({
  slots,
  subjects,
  onAddSlot,
  onChangeSlot,
  onRemoveSlot,
}: ExceptionSlotEditorProps): React.ReactElement => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <span className="block text-sm font-medium text-foreground">
        Classes for this day
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onAddSlot}
        disabled={subjects.length === 0}
      >
        Add
      </Button>
    </div>

    {slots.length === 0 ? (
      <div className="text-center py-6 text-muted border-2 border-dashed border-border rounded-lg">
        <p className="text-sm">No classes (day off)</p>
      </div>
    ) : (
      <div className="space-y-2">
        {slots.map((slot, index) => (
          <div
            key={slot.id}
            className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border"
          >
            <span className="text-xs text-muted bg-surface w-6 h-6 rounded flex items-center justify-center font-medium">
              {index + 1}
            </span>
            <select
              value={slot.subjectId}
              onChange={(e) => onChangeSlot(slot.id, e.target.value)}
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm"
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onRemoveSlot(slot.id)}
              className="p-2 text-muted hover:text-red-500 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>Remove</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);
