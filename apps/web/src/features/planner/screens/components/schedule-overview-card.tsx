import { Button } from '@papersync/ui/button';
import { Card, CardContent, CardHeader } from '@papersync/ui/card';
import Link from 'next/link';
import type { TimetableDay } from '@/shared/hooks/use-settings';
import type { DayOfWeek, Subject } from '@/shared/types/schemas';
import type { ScheduleException } from '../planner-screen-types';
import { WeekScheduleOverview } from './week-schedule-overview';

type ScheduleOverviewCardProps = {
  readonly weekStartDate: Date;
  readonly timetable: readonly TimetableDay[];
  readonly exceptions: readonly ScheduleException[];
  readonly subjects: readonly Subject[];
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
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 justify-between">
          <div className="min-w-0">
            <h2 className="serif text-[20px] tracking-[-0.022em] text-ink">
              Week schedule
            </h2>
            <p className="text-[13px] text-graphite mt-0.5">
              {exceptionsCount > 0
                ? `${exceptionsCount} exception${exceptionsCount !== 1 ? 's' : ''} for this week`
                : 'Review and add exceptions if needed'}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/settings">Edit timetable</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!hasTimetableConfigured ? (
          <div className="text-center py-8 px-4 text-graphite border border-dashed border-hairline-strong">
            <p className="serif text-[16px] text-ink">
              No timetable configured
            </p>
            <p className="text-[13px] mt-1">
              Set your weekly schedule in settings first
            </p>
            <div className="mt-4 flex justify-center">
              <Button asChild variant="secondary" size="sm">
                <Link href="/settings">Go to settings</Link>
              </Button>
            </div>
          </div>
        ) : (
          <WeekScheduleOverview
            weekStartDate={weekStartDate}
            timetable={timetable}
            exceptions={exceptions}
            subjects={subjects}
            onEditException={onEditException}
          />
        )}
      </CardContent>
    </Card>
  );
};
