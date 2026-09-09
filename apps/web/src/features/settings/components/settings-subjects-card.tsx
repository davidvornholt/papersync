'use client';

import { Button } from '@papersync/ui/button';
import { Card, CardContent, CardHeader } from '@papersync/ui/card';
import { AnimatePresence } from 'motion/react';
import type { DayOfWeek, Settings } from '@/shared/hooks/use-settings-schema';
import { SubjectListItem } from './subject-list-item';
import { TimetableConfigPanel } from './timetable-config-panel';

type SettingsSubjectsCardProps = {
  readonly settings: Settings;
  readonly isVaultConfigured: boolean;
  readonly configuredDaysCount: number;
  readonly onOpenSubjectModal: () => void;
  readonly onEditSubject: (id: string) => void;
  readonly onDeleteSubject: (id: string) => void;
  readonly onAddTimetableSlot: (day: DayOfWeek, subjectId: string) => void;
  readonly onRemoveTimetableSlot: (day: DayOfWeek, slotId: string) => void;
  readonly onUpdateTimetableSlot: (
    day: DayOfWeek,
    slotId: string,
    subjectId: string,
  ) => void;
};

export const SettingsSubjectsCard = ({
  settings,
  isVaultConfigured,
  configuredDaysCount,
  onOpenSubjectModal,
  onEditSubject,
  onDeleteSubject,
  onAddTimetableSlot,
  onRemoveTimetableSlot,
  onUpdateTimetableSlot,
}: SettingsSubjectsCardProps): React.ReactElement => (
  <Card>
    <CardHeader>
      <h2 className="serif text-[20px] text-ink tracking-[-0.022em]">
        Subjects & timetable
      </h2>
      <p className="mt-0.5 text-[13px] text-graphite">
        {isVaultConfigured
          ? `${settings.subjects.length} subject${settings.subjects.length === 1 ? '' : 's'} · ${configuredDaysCount} day${configuredDaysCount === 1 ? '' : 's'} configured`
          : 'Configure vault connection first'}
      </p>
    </CardHeader>

    <CardContent className="space-y-7">
      {isVaultConfigured ? (
        <>
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
            <h3 className="serif mb-3 text-[16px] text-ink tracking-[-0.018em]">
              Weekly schedule
            </h3>
            <TimetableConfigPanel
              subjects={settings.subjects}
              timetable={settings.timetable}
              onAddSlot={onAddTimetableSlot}
              onRemoveSlot={onRemoveTimetableSlot}
              onUpdateSlot={onUpdateTimetableSlot}
            />
          </div>
        </>
      ) : (
        <div className="border border-hairline-strong border-dashed px-4 py-8 text-center text-graphite">
          <p className="serif-italic text-[14px]">
            Vault connection required before configuring subjects and timetable.
          </p>
        </div>
      )}
    </CardContent>
  </Card>
);
