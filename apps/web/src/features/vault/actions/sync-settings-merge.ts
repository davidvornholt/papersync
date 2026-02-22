import type { SubjectsConfig } from '@/shared/types';
import type { TimetableConfig } from '../services/config';

export const mergeSubjects = (
  existing: SubjectsConfig,
  incoming: SubjectsConfig,
): SubjectsConfig => {
  const incomingById = new Map(
    incoming.map((subject) => [subject.id, subject]),
  );
  const existingIds = new Set(existing.map((subject) => subject.id));

  const updatedExisting = existing.map((existingSubject) => {
    const incomingSubject = incomingById.get(existingSubject.id);
    return incomingSubject ?? existingSubject;
  });

  const newSubjects = incoming.filter(
    (subject) => !existingIds.has(subject.id),
  );
  return [...updatedExisting, ...newSubjects];
};

export const mergeTimetable = (
  existing: TimetableConfig,
  incoming: TimetableConfig,
): TimetableConfig => {
  const existingDays = new Map(existing.map((day) => [day.day, day]));
  const incomingDays = new Map(incoming.map((day) => [day.day, day]));
  const allDays = new Set([...existingDays.keys(), ...incomingDays.keys()]);
  const result: TimetableConfig[number][] = [];

  for (const day of allDays) {
    const existingDay = existingDays.get(day);
    const incomingDay = incomingDays.get(day);

    if (!incomingDay) {
      if (existingDay) result.push(existingDay);
      continue;
    }

    if (!existingDay) {
      result.push(incomingDay);
      continue;
    }

    const incomingSlotById = new Map(
      incomingDay.slots.map((slot) => [slot.id, slot]),
    );
    const existingSlotIds = new Set(existingDay.slots.map((slot) => slot.id));

    const updatedExistingSlots = existingDay.slots.map((existingSlot) => {
      const incomingSlot = incomingSlotById.get(existingSlot.id);
      return incomingSlot ?? existingSlot;
    });
    const newSlots = incomingDay.slots.filter(
      (slot) => !existingSlotIds.has(slot.id),
    );

    result.push({ day, slots: [...updatedExistingSlots, ...newSlots] });
  }

  return result;
};
