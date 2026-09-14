import type { TaskAction } from '@/shared/types/schemas';
export type ExtractedEntry = {
  readonly id: string;
  readonly day: string;
  readonly subject: string;
  readonly content: string;
  readonly isCompleted: boolean;
  readonly action: TaskAction;
  readonly dueDate?: string;
};
