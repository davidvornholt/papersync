import * as S from 'effect/Schema';

const VaultMethodSchema = S.Union(S.Literal('local'), S.Literal('github'));
const AIProviderSchema = S.Union(S.Literal('google'), S.Literal('ollama'));
const DayOfWeekSchema = S.Union(
  S.Literal('monday'),
  S.Literal('tuesday'),
  S.Literal('wednesday'),
  S.Literal('thursday'),
  S.Literal('friday'),
  S.Literal('saturday'),
  S.Literal('sunday'),
);

const SubjectSchema = S.Struct({
  id: S.String,
  name: S.String,
  color: S.optional(S.String),
});

const TimetableSlotSchema = S.Struct({
  id: S.String,
  subjectId: S.String,
});

const TimetableDaySchema = S.Struct({
  day: DayOfWeekSchema,
  slots: S.Array(TimetableSlotSchema),
});

export const SettingsSchema = S.Struct({
  vault: S.Struct({
    method: VaultMethodSchema,
    localPath: S.optional(S.String),
    githubConnected: S.optional(S.Boolean),
    githubRepo: S.optional(S.String),
    githubUsername: S.optional(S.String),
    githubToken: S.optional(S.String),
  }),
  ai: S.Struct({
    provider: AIProviderSchema,
    googleApiKey: S.optional(S.String),
    ollamaEndpoint: S.optional(S.String),
  }),
  subjects: S.Array(SubjectSchema),
  timetable: S.Array(TimetableDaySchema),
});

export type Settings = S.Schema.Type<typeof SettingsSchema>;
export type VaultMethod = S.Schema.Type<typeof VaultMethodSchema>;
export type AIProvider = S.Schema.Type<typeof AIProviderSchema>;
export type Subject = S.Schema.Type<typeof SubjectSchema>;
export type DayOfWeek = S.Schema.Type<typeof DayOfWeekSchema>;
export type TimetableSlot = S.Schema.Type<typeof TimetableSlotSchema>;
export type TimetableDay = S.Schema.Type<typeof TimetableDaySchema>;

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const createDefaultTimetable = (): TimetableDay[] =>
  DAYS_OF_WEEK.map((day) => ({ day, slots: [] }));

export const defaultSettings: Settings = {
  vault: {
    method: 'local',
    localPath: '',
    githubConnected: false,
    githubRepo: '',
  },
  ai: {
    provider: 'google',
    googleApiKey: '',
    ollamaEndpoint: 'http://localhost:11434',
  },
  subjects: [
    { id: '1', name: 'Chemistry' },
    { id: '2', name: 'Literature' },
    { id: '3', name: 'Mathematics' },
    { id: '4', name: 'Physics' },
  ],
  timetable: createDefaultTimetable(),
};
