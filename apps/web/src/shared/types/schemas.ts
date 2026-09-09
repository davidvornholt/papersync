import { DueDate, Week } from '@papersync/homework/contract';
import { Schema } from 'effect';

const minimumSubjectsPerDay = 3;
const maximumSubjectsPerDay = 6;
export const WeekId = Week.pipe(Schema.brand('WeekId'));
export type WeekId = typeof WeekId.Type;

export const ISODate = DueDate.pipe(Schema.brand('ISODate'));
export type ISODate = typeof ISODate.Type;

export const ISODateTime = Schema.String.pipe(
  Schema.pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/u),
  Schema.brand('ISODateTime'),
);
export type ISODateTime = typeof ISODateTime.Type;

export const Subject = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  color: Schema.optional(Schema.String),
});
export type Subject = typeof Subject.Type;

export const SubjectsConfig = Schema.Array(Subject);
export type SubjectsConfig = typeof SubjectsConfig.Type;

export const DayOfWeek = Schema.Literal(
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
);
export type DayOfWeek = typeof DayOfWeek.Type;

export const TimeSlot = Schema.Struct({
  id: Schema.String,
  subjectId: Schema.String,
  startTime: Schema.String, // HH:MM format
  endTime: Schema.String, // HH:MM format
});
export type TimeSlot = typeof TimeSlot.Type;

export const DaySchedule = Schema.Struct({
  day: DayOfWeek,
  slots: Schema.Array(TimeSlot),
});
export type DaySchedule = typeof DaySchedule.Type;

export const ScheduleException = Schema.Struct({
  id: Schema.String,
  date: ISODate,
  reason: Schema.optional(Schema.String),
  slots: Schema.Array(TimeSlot), // Override slots for this specific date
});
export type ScheduleException = typeof ScheduleException.Type;

export const Timetable = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  weeklySchedule: Schema.Array(DaySchedule),
  exceptions: Schema.Array(ScheduleException),
  createdAt: ISODateTime,
  updatedAt: ISODateTime,
});
export type Timetable = typeof Timetable.Type;

export const TaskAction = Schema.Literal('add', 'modify', 'complete');
export type TaskAction = typeof TaskAction.Type;

export const TaskEntry = Schema.Struct({
  day: Schema.String,
  subject: Schema.String,
  content: Schema.String,
  isTask: Schema.Boolean,
  isCompleted: Schema.Boolean,
  action: TaskAction,
  dueDate: Schema.optional(ISODate),
});
export type TaskEntry = typeof TaskEntry.Type;

export const OCRResponse = Schema.Struct({
  entries: Schema.Array(TaskEntry),
  confidence: Schema.Number.pipe(
    Schema.greaterThanOrEqualTo(0),
    Schema.lessThanOrEqualTo(1),
  ),
  notes: Schema.optional(Schema.String),
});
export type OCRResponse = typeof OCRResponse.Type;

export const DayEntry = Schema.Struct({
  subject: Schema.String,
  tasks: Schema.Array(
    Schema.Struct({
      content: Schema.String,
      isCompleted: Schema.Boolean,
      dueDate: Schema.optional(ISODate),
    }),
  ),
});
export type DayEntry = typeof DayEntry.Type;

export const DayRecord = Schema.Struct({
  date: ISODate,
  dayName: Schema.String,
  entries: Schema.Array(DayEntry),
});
export type DayRecord = typeof DayRecord.Type;

/**
 * Task item for general tasks (not bound to a subject)
 */
export const GeneralTask = Schema.Struct({
  content: Schema.String,
  isCompleted: Schema.Boolean,
  dueDate: Schema.optional(ISODate),
});
export type GeneralTask = typeof GeneralTask.Type;

export const WeeklyNote = Schema.Struct({
  week: WeekId,
  dateRange: Schema.Struct({
    start: ISODate,
    end: ISODate,
  }),
  syncedAt: Schema.optional(ISODateTime),
  days: Schema.Array(DayRecord),
  /** General tasks for the entire week (displayed at the end of the file) */
  generalTasks: Schema.Array(GeneralTask),
});
export type WeeklyNote = typeof WeeklyNote.Type;

export const QRPayload = Schema.Struct({
  week: WeekId,
  checksum: Schema.String,
  version: Schema.Literal(1),
});
export type QRPayload = typeof QRPayload.Type;

export const VaultAccessMethod = Schema.Literal('local', 'github');
export type VaultAccessMethod = typeof VaultAccessMethod.Type;

export const AIProvider = Schema.Literal('google', 'ollama');
export type AIProvider = typeof AIProvider.Type;

export const AppConfig = Schema.Struct({
  vaultPath: Schema.String,
  vaultAccessMethod: VaultAccessMethod,
  aiProvider: AIProvider,
  githubToken: Schema.optional(Schema.String),
  githubRepo: Schema.optional(Schema.String),
  ollamaEndpoint: Schema.optional(Schema.String),
  subjectsPerDay: Schema.Number.pipe(
    Schema.greaterThanOrEqualTo(minimumSubjectsPerDay),
    Schema.lessThanOrEqualTo(maximumSubjectsPerDay),
  ),
});
export type AppConfig = typeof AppConfig.Type;
