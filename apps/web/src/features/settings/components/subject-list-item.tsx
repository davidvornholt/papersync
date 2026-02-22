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
    className="flex items-center justify-between p-3 bg-background rounded-lg border border-border group hover:border-accent/30 transition-colors"
  >
    <span className="text-foreground font-medium">{subject.name}</span>
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        type="button"
        onClick={() => onEdit(subject.id)}
        className="p-2 text-muted hover:text-accent rounded"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => onDelete(subject.id)}
        className="p-2 text-muted hover:text-red-500 rounded"
      >
        Delete
      </button>
    </div>
  </motion.li>
);
