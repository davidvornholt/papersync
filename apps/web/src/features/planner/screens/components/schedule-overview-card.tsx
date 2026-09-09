import { Button } from '@papersync/ui/button';
import { Card, CardContent, CardHeader } from '@papersync/ui/card';
import Link from 'next/link';
import type { TimetableDay } from '@/shared/hooks/use-settings-schema';
import type { DayOfWeek, Subject } from '@/shared/types/schemas';
import type { ScheduleException } from '../planner-screen-types';
import { WeekScheduleOverview } from './week-schedule-overview';

type ScheduleOverviewCardProps = {
  readonly weekStartDate: Date;
  readonly timetable: ReadonlyArray<TimetableDay>;
  readonly exceptions: ReadonlyArray<ScheduleException>;
  readonly subjects: ReadonlyArray<Subject>;
  readonly hasTimetableConfigured: boolean;
  readonly onEditException: (date: Date, dayOfWeek: DayOfWeek) => void;
};

export const ScheduleOverviewCard = ({
  weekStartDate,
  timetable,
  exceptions,
  subjects,
  hasTimetableConfigured,
  onEditException,
}: ScheduleOverviewCardProps): React.ReactElement => {
  const exceptionsCount = exceptions.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h2 className="serif text-[20px] text-ink tracking-[-0.022em]">
              Week schedule
            </h2>
            <p className="mt-0.5 text-[13px] text-graphite">
              {exceptionsCount > 0
                ? `${exceptionsCount} exception${exceptionsCount === 1 ? '' : 's'} for this week`
                : 'Review and add exceptions if needed'}
            </p>
          </div>
          <Button asChild={true} variant="ghost" size="sm">
            <Link href="/settings">Edit timetable</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {hasTimetableConfigured ? (
          <WeekScheduleOverview
            weekStartDate={weekStartDate}
            timetable={timetable}
            exceptions={exceptions}
            subjects={subjects}
            onEditException={onEditException}
          />
        ) : (
          <div className="border border-hairline-strong border-dashed px-4 py-8 text-center text-graphite">
            <p className="serif text-[16px] text-ink">
              No timetable configured
            </p>
            <p className="mt-1 text-[13px]">
              Set your weekly schedule in settings first
            </p>
            <div className="mt-4 flex justify-center">
              <Button asChild={true} variant="secondary" size="sm">
                <Link href="/settings">Go to settings</Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
