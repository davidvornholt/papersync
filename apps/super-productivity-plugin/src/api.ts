export type Task = {
  readonly id: string;
  readonly notes?: string;
  readonly isDone?: boolean;
  readonly dueDay?: string | null;
};
export type TaskInput = {
  readonly title: string;
  readonly notes: string;
  readonly isDone: boolean;
  readonly dueDay?: string | null;
  readonly projectId?: string;
  readonly tagIds?: ReadonlyArray<string>;
};

// The published plugin-api package predates these methods. This port follows the v18.21.2 host contract.
export type PluginApi = {
  readonly getAllProjects: () => Promise<
    ReadonlyArray<{
      readonly id: string;
      readonly title: string;
      readonly isArchived?: boolean;
    }>
  >;
  readonly getAllTags: () => Promise<
    ReadonlyArray<{ readonly id: string; readonly title: string }>
  >;
  readonly getTasks: () => Promise<ReadonlyArray<Task>>;
  readonly getArchivedTasks: () => Promise<ReadonlyArray<Task>>;
  readonly addTask: (input: TaskInput) => Promise<string>;
  readonly updateTask: (id: string, input: Partial<TaskInput>) => Promise<void>;
  readonly getSecret: (key: string) => Promise<string | null>;
  readonly setSecret: (key: string, value: string) => Promise<void>;
  readonly request: (
    url: string,
    options: {
      readonly method?: string;
      readonly headers: Readonly<Record<string, string>>;
      readonly body?: unknown;
    },
  ) => Promise<unknown>;
  readonly showSnack: (options: {
    readonly msg: string;
    readonly type: 'SUCCESS' | 'ERROR' | 'INFO';
  }) => void;
  readonly registerHeaderButton: (options: {
    readonly label: string;
    readonly icon: string;
    readonly onClick: () => void;
  }) => void;
  readonly registerConfigHandler: (handler: () => void) => void;
  readonly openDialog: (options: {
    readonly title: string;
    readonly htmlContent: string;
    readonly buttons: ReadonlyArray<{
      readonly label: string;
      readonly onClick?: () => void;
    }>;
  }) => Promise<string | undefined>;
};
