'use client';

import { AnimatePresence } from 'motion/react';
import { Button, Card, CardContent, CardHeader } from '@/shared/components';
import type { DayOfWeek, Settings } from '@/shared/hooks/use-settings';
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
      <h2 className="text-lg font-semibold font-display">
        Subjects & Timetable
      </h2>
      <p className="text-sm text-muted">
        {isVaultConfigured
          ? `${settings.subjects.length} subject(s) • ${configuredDaysCount} day(s) configured`
          : 'Configure vault connection first'}
      </p>
    </CardHeader>

    <CardContent className="space-y-6">
      {!isVaultConfigured ? (
        <div className="text-center py-8 text-muted border-2 border-dashed border-border rounded-lg bg-surface/50">
          Vault connection required before configuring subjects and timetable.
        </div>
      ) : (
        <>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-foreground">Subjects</h3>
              <Button variant="ghost" size="sm" onClick={onOpenSubjectModal}>
                Add Subject
              </Button>
            </div>
            <ul className="space-y-2">
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

          <div className="border-t border-border" />

          <div>
            <h3 className="font-medium text-foreground mb-3">
              Weekly Schedule
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
      )}
    </CardContent>
  </Card>
);
