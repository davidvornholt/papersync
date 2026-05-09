import { Button } from '@papersync/ui/button';
import type { Subject } from '@/shared/types/schemas';

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
    <div className="flex items-baseline justify-between mb-3">
      <span className="field-label">Classes for this day</span>
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
      <div className="text-center py-6 text-graphite border border-dashed border-hairline-strong">
        <p className="serif-italic text-[14px]">No classes (day off)</p>
      </div>
    ) : (
      <ul className="-mx-1">
        {slots.map((slot, index) => (
          <li
            key={slot.id}
            className="flex items-center gap-3 px-1 py-2 border-b border-hairline last:border-b-0"
          >
            <span className="mono text-[11px] text-graphite w-6 text-right">
              {String(index + 1).padStart(2, '0')}
            </span>
            <select
              value={slot.subjectId}
              onChange={(e) => onChangeSlot(slot.id, e.target.value)}
              className="flex-1 bg-transparent border-0 border-b border-hairline-strong px-0 py-2 text-[14px] text-ink focus:outline-none focus:border-ink cursor-pointer"
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
              className="p-2 text-graphite hover:text-accent transition-colors cursor-pointer touch-manipulation"
              aria-label="Remove class"
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
                  strokeWidth={1.6}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);
