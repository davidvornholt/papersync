'use client';

import { motion } from 'motion/react';
import type { Subject } from '@/shared/hooks/use-settings';

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
    layout
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 10, height: 0 }}
    className="flex items-center justify-between gap-3 px-1 py-3 border-b border-hairline last:border-b-0"
  >
    <span className="serif text-[16px] tracking-[-0.018em] text-ink min-w-0 truncate">
      {subject.name}
    </span>
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={() => onEdit(subject.id)}
        className="px-2 py-1 mono text-[10px] uppercase tracking-[0.18em] text-graphite hover:text-ink transition-colors cursor-pointer touch-manipulation"
      >
        Edit
      </button>
      <span aria-hidden className="text-graphite/40">
        ·
      </span>
      <button
        type="button"
        onClick={() => onDelete(subject.id)}
        className="px-2 py-1 mono text-[10px] uppercase tracking-[0.18em] text-graphite hover:text-accent transition-colors cursor-pointer touch-manipulation"
      >
        Delete
      </button>
    </div>
  </motion.li>
);
