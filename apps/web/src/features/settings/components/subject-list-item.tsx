'use client';

import { motion } from 'motion/react';
import type { Subject } from '@/shared/hooks/use-settings-schema';

type SubjectListItemProps = {
  readonly subject: Subject;
  readonly onEdit: (id: string) => void;
  readonly onDelete: (id: string) => void;
};

export const SubjectListItem = ({
  subject,
  onEdit,
  onDelete,
}: SubjectListItemProps): React.ReactElement => (
  <motion.li
    layout={true}
    initial={false}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 10, height: 0 }}
    className="flex items-center justify-between gap-3 border-hairline border-b px-1 py-3 last:border-b-0"
  >
    <span className="serif min-w-0 truncate text-[16px] text-ink tracking-[-0.018em]">
      {subject.name}
    </span>
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => onEdit(subject.id)}
        className="mono cursor-pointer touch-manipulation px-2 py-1 text-[10px] text-graphite uppercase tracking-[0.18em] transition-colors hover:text-ink"
      >
        Edit
      </button>
      <span aria-hidden={true} className="text-graphite/40">
        ·
      </span>
      <button
        type="button"
        onClick={() => onDelete(subject.id)}
        className="mono cursor-pointer touch-manipulation px-2 py-1 text-[10px] text-graphite uppercase tracking-[0.18em] transition-colors hover:text-accent"
      >
        Delete
      </button>
    </div>
  </motion.li>
);
