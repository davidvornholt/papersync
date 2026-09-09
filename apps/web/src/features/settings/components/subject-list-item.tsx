'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { IconButton } from '@/shared/components/icon-button';
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
      <IconButton
        label={`Edit ${subject.name}`}
        onClick={() => onEdit(subject.id)}
      >
        <Pencil size={16} aria-hidden={true} />
      </IconButton>
      <IconButton
        label={`Delete ${subject.name}`}
        onClick={() => onDelete(subject.id)}
      >
        <Trash2 size={16} aria-hidden={true} />
      </IconButton>
    </div>
  </motion.li>
);
