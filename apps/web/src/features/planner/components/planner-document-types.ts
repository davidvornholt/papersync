import type { Subject, WeekId } from '@/shared/types/schemas';

type TimetableSlot = {
  readonly id: string;
  readonly subjectId: string;
};

export type TimetableDay = {
  readonly day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  readonly slots: ReadonlyArray<TimetableSlot>;
};

export type PlannerProps = {
  readonly weekId: WeekId;
  readonly dateRange: {
    readonly start: Date;
    readonly end: Date;
  };
  readonly subjects: ReadonlyArray<Subject>;
  readonly timetable: ReadonlyArray<TimetableDay>;
  readonly qrDataUrl: string;
};

export type DayInfo = {
  readonly name: string;
  readonly shortName: string;
  readonly date: Date;
  readonly dayKey: TimetableDay['day'];
};

export type DayData = {
  readonly day: DayInfo;
  readonly subjects: ReadonlyArray<Subject>;
  readonly weight: number;
  readonly linesPerSubject: number;
};
