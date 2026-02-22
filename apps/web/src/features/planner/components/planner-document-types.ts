import type { Subject, WeekId } from '@/shared/types';

type TimetableSlot = {
  readonly id: string;
  readonly subjectId: string;
};

export type TimetableDay = {
  readonly day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  readonly slots: readonly TimetableSlot[];
};

export type PlannerProps = {
  readonly weekId: WeekId;
  readonly dateRange: {
    readonly start: Date;
    readonly end: Date;
  };
  readonly subjects: readonly Subject[];
  readonly timetable: readonly TimetableDay[];
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
  readonly subjects: readonly Subject[];
  readonly weight: number;
  readonly linesPerSubject: number;
};
