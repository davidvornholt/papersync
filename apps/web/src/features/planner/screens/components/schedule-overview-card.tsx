import Link from 'next/link';
import { Button, Card, CardContent, CardHeader } from '@/shared/components';
import type { TimetableDay } from '@/shared/hooks/use-settings';
import type { DayOfWeek, Subject } from '@/shared/types';
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold font-display">
              Week Schedule
            </h2>
            <p className="text-sm text-muted">
              {exceptionsCount > 0
                ? `${exceptionsCount} exception${exceptionsCount !== 1 ? 's' : ''} for this week`
                : 'Review and add exceptions if needed'}
            </p>
          </div>
          <Link href="/settings">
            <Button variant="ghost" size="sm">
              Edit Timetable
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {!hasTimetableConfigured ? (
          <div className="text-center py-8 text-muted border-2 border-dashed border-border rounded-lg">
            <p className="font-medium">No timetable configured</p>
            <p className="text-sm mt-1">
              Configure your weekly schedule in Settings first
            </p>
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="mt-3">
                Go to Settings
              </Button>
            </Link>
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
