'use client';

import { Button } from '@papersync/ui/button';
import { Card, CardContent, CardHeader } from '@papersync/ui/card';
import { AnimatePresence } from 'motion/react';
import type { DayOfWeek, Settings } from '@/shared/settings/schema';
import { SubjectListItem } from './subject-list-item';
import { TimetableConfigPanel } from './timetable-config-panel';

type SettingsSubjectsCardProps = {
  readonly settings: Settings;
  readonly configuredDaysCount: number;
  readonly onOpenSubjectModal: () => void;
  readonly onEditSubject: (id: string) => void;
  readonly onDeleteSubject: (id: string) => void;
  readonly onAddSubjectToDay: (day: DayOfWeek, subjectId: string) => void;
  readonly onRemoveSubjectFromDay: (day: DayOfWeek, subjectId: string) => void;
};

export const SettingsSubjectsCard = ({
  settings,
  configuredDaysCount,
  onOpenSubjectModal,
  onEditSubject,
  onDeleteSubject,
  onAddSubjectToDay,
  onRemoveSubjectFromDay,
}: SettingsSubjectsCardProps): React.ReactElement => (
  <Card>
    <CardHeader>
      <h2 className="serif text-[20px] text-ink tracking-[-0.022em]">
        Subjects & timetable
      </h2>
      <p className="mt-0.5 text-[13px] text-graphite">
        {`${settings.subjects.length} subject${settings.subjects.length === 1 ? '' : 's'} · ${configuredDaysCount} day${configuredDaysCount === 1 ? '' : 's'} with classes`}
      </p>
    </CardHeader>

    <CardContent className="space-y-7">
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="serif text-[16px] text-ink tracking-[-0.018em]">
            Subjects
          </h3>
          <Button variant="ghost" size="sm" onClick={onOpenSubjectModal}>
            Add subject
          </Button>
        </div>
        <ul className="-mx-1">
          <AnimatePresence>
            {[...settings.subjects]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((subject) => (
                <SubjectListItem
                  key={subject.id}
                  subject={subject}
                  onEdit={onEditSubject}
                  onDelete={onDeleteSubject}
                />
              ))}
          </AnimatePresence>
        </ul>
      </div>

      <div className="rule" />

      <div>
        <h3 className="serif mb-1 text-[16px] text-ink tracking-[-0.018em]">
          Weekly schedule
        </h3>
        <p className="mb-4 text-[13px] text-graphite">
          Pick which subjects you have on each day. Each becomes a row on the
          printed sheet, in this order.
        </p>
        <TimetableConfigPanel
          subjects={settings.subjects}
          timetable={settings.timetable}
          onAddSubjectToDay={onAddSubjectToDay}
          onRemoveSubjectFromDay={onRemoveSubjectFromDay}
        />
      </div>
    </CardContent>
  </Card>
);
