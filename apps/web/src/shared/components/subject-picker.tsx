'use client';

import { Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { chip, open, presence } from '@/shared/motion/presets';
import type { Subject } from '@/shared/settings/schema';

type SubjectPickerProps = {
  /** Where the picked subjects apply, for example "Monday"; used in labels. */
  readonly scope: string;
  readonly subjects: ReadonlyArray<Subject>;
  readonly selectedIds: ReadonlyArray<string>;
  readonly onAdd: (subjectId: string) => void;
  readonly onRemove: (subjectId: string) => void;
  readonly emptyLabel: string;
};

/**
 * Picks the distinct subjects for one day. Chosen subjects sit in sheet
 * order with a remove control; the remaining subjects wait below as chips.
 */
export const SubjectPicker = ({
  scope,
  subjects,
  selectedIds,
  onAdd,
  onRemove,
  emptyLabel,
}: SubjectPickerProps): React.ReactElement => {
  const byId = new Map(subjects.map((subject) => [subject.id, subject]));
  const chosen = selectedIds.flatMap((id) => {
    const subject = byId.get(id);
    return subject ? [subject] : [];
  });
  const available = subjects.filter(
    (subject) => !selectedIds.includes(subject.id),
  );

  return (
    <div className="space-y-4">
      <ol
        aria-label={`Subjects on ${scope}`}
        className="flex min-h-11 flex-wrap items-center gap-2"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {chosen.length === 0 ? (
            <motion.li
              key="empty"
              layout={true}
              variants={chip}
              {...presence}
              className="serif-italic list-none text-[14px] text-graphite"
            >
              {emptyLabel}
            </motion.li>
          ) : (
            chosen.map((subject, index) => (
              <motion.li
                key={subject.id}
                layout={true}
                layoutId={`subject-chip-${scope}-${subject.id}`}
                variants={chip}
                {...presence}
                transition={open}
                className="flex items-center gap-1 bg-ink pr-1 pl-3 text-paper"
              >
                <span className="mono text-[10px] text-paper/60">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="py-2 text-[13px]">{subject.name}</span>
                <button
                  type="button"
                  onClick={() => onRemove(subject.id)}
                  aria-label={`Remove ${subject.name} from ${scope}`}
                  className="inline-flex size-8 cursor-pointer touch-manipulation items-center justify-center text-paper/70 transition-colors hover:text-paper focus-visible:text-paper"
                >
                  <X size={14} aria-hidden={true} />
                </button>
              </motion.li>
            ))
          )}
        </AnimatePresence>
      </ol>

      {available.length > 0 ? (
        <ul
          aria-label={`Subjects not on ${scope}`}
          className="flex flex-wrap gap-2"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {available.map((subject) => (
              <motion.li
                key={subject.id}
                layout={true}
                layoutId={`subject-chip-${scope}-${subject.id}`}
                variants={chip}
                {...presence}
                transition={open}
              >
                <button
                  type="button"
                  onClick={() => onAdd(subject.id)}
                  aria-label={`Add ${subject.name} to ${scope}`}
                  className="inline-flex min-h-10 cursor-pointer touch-manipulation items-center gap-1.5 border border-hairline-strong bg-paper px-3 text-[13px] text-ink transition-colors hover:border-ink hover:bg-paper-deep focus-visible:border-ink"
                >
                  <Plus
                    size={13}
                    aria-hidden={true}
                    className="text-graphite"
                  />
                  {subject.name}
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : null}
    </div>
  );
};
