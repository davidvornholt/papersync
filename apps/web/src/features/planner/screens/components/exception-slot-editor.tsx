import { Button } from '@papersync/ui/button';
import { Select } from '@papersync/ui/select';
import type { Subject } from '@/shared/types/schemas';

type ExceptionSlotEditorProps = {
  readonly slots: Array<{ id: string; subjectId: string }>;
  readonly subjects: ReadonlyArray<Subject>;
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
    <div className="mb-3 flex items-baseline justify-between">
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
      <div className="border border-hairline-strong border-dashed py-6 text-center text-graphite">
        <p className="serif-italic text-[14px]">No classes (day off)</p>
      </div>
    ) : (
      <ul className="-mx-1">
        {slots.map((slot, index) => (
          <li
            key={slot.id}
            className="flex items-center gap-3 border-hairline border-b px-1 py-2 last:border-b-0"
          >
            <span className="mono w-6 text-right text-[11px] text-graphite">
              {String(index + 1).padStart(2, '0')}
            </span>
            <Select
              value={slot.subjectId}
              onChange={(e) => onChangeSlot(slot.id, e.target.value)}
              className="min-w-0 flex-1 text-[14px]"
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </Select>
            <button
              type="button"
              onClick={() => onRemoveSlot(slot.id)}
              className="cursor-pointer touch-manipulation p-2 text-graphite transition-colors hover:text-accent"
              aria-label="Remove class"
            >
              <svg
                className="size-4"
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
