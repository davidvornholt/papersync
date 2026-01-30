import { Effect } from "effect";
import type {
  DayEntry,
  DayRecord,
  GeneralTask,
  OCRResponse,
  WeeklyNote,
} from "@/app/shared/types";

// ============================================================================
// Diff Processing - Merge OCR results into weekly note
// ============================================================================

export const mergeOCRIntoWeeklyNote = (
  existingNote: WeeklyNote,
  ocrResponse: OCRResponse,
): Effect.Effect<WeeklyNote, never> =>
  Effect.sync(() => {
    // Separate general tasks from subject entries
    const generalTaskEntries = ocrResponse.entries.filter(
      (e) => e.subject === "General Tasks",
    );
    const subjectEntries = ocrResponse.entries.filter(
      (e) => e.subject !== "General Tasks",
    );

    // Process day-specific subject entries
    const updatedDays = existingNote.days.map((day) => {
      const entriesForDay = subjectEntries.filter(
        (e) => e.day.toLowerCase() === day.dayName.toLowerCase(),
      );

      if (entriesForDay.length === 0) {
        return day;
      }

      return processDayEntries(day, entriesForDay);
    });

    // Process week-level general tasks
    const updatedGeneralTasks = [...existingNote.generalTasks];
    for (const entry of generalTaskEntries) {
      processGeneralTask(updatedGeneralTasks, entry);
    }

    return {
      ...existingNote,
      syncedAt: new Date().toISOString() as WeeklyNote["syncedAt"],
      days: updatedDays,
      generalTasks: updatedGeneralTasks,
    };
  });

const processDayEntries = (
  day: DayRecord,
  ocrEntries: readonly OCRResponse["entries"][number][],
): DayRecord => {
  const updatedEntries: DayEntry[] = [...day.entries];

  for (const ocrEntry of ocrEntries) {
    processSubjectEntry(updatedEntries, ocrEntry);
  }

  return {
    ...day,
    entries: updatedEntries,
  };
};

const processSubjectEntry = (
  entries: DayEntry[],
  ocrEntry: OCRResponse["entries"][number],
): void => {
  const existingSubjectIndex = entries.findIndex(
    (e) => e.subject.toLowerCase() === ocrEntry.subject.toLowerCase(),
  );

  if (existingSubjectIndex === -1) {
    // New subject, create entry
    entries.push({
      subject: ocrEntry.subject,
      tasks: [
        {
          content: ocrEntry.content,
          isCompleted: ocrEntry.isCompleted,
        },
      ],
    });
    return;
  }

  const existingSubject = entries[existingSubjectIndex];

  switch (ocrEntry.action) {
    case "add":
      entries[existingSubjectIndex] = {
        ...existingSubject,
        tasks: [
          ...existingSubject.tasks,
          {
            content: ocrEntry.content,
            isCompleted: ocrEntry.isCompleted,
          },
        ],
      };
      break;

    case "modify": {
      const taskIndex = existingSubject.tasks.findIndex((t) =>
        t.content
          .toLowerCase()
          .includes(ocrEntry.content.toLowerCase().slice(0, 20)),
      );
      if (taskIndex !== -1) {
        const updatedTasks = [...existingSubject.tasks];
        updatedTasks[taskIndex] = {
          content: ocrEntry.content,
          isCompleted: ocrEntry.isCompleted,
        };
        entries[existingSubjectIndex] = {
          ...existingSubject,
          tasks: updatedTasks,
        };
      }
      break;
    }

    case "complete": {
      const taskToComplete = existingSubject.tasks.findIndex((t) =>
        t.content
          .toLowerCase()
          .includes(ocrEntry.content.toLowerCase().slice(0, 20)),
      );
      if (taskToComplete !== -1) {
        const updatedTasks = [...existingSubject.tasks];
        updatedTasks[taskToComplete] = {
          ...updatedTasks[taskToComplete],
          isCompleted: true,
        };
        entries[existingSubjectIndex] = {
          ...existingSubject,
          tasks: updatedTasks,
        };
      }
      break;
    }
  }
};

const processGeneralTask = (
  generalTasks: GeneralTask[],
  ocrEntry: OCRResponse["entries"][number],
): void => {
  switch (ocrEntry.action) {
    case "add":
      generalTasks.push({
        content: ocrEntry.content,
        isCompleted: ocrEntry.isCompleted,
      });
      break;

    case "modify":
    case "complete": {
      const index = generalTasks.findIndex((t) =>
        t.content
          .toLowerCase()
          .includes(ocrEntry.content.toLowerCase().slice(0, 20)),
      );
      if (index !== -1) {
        generalTasks[index] = {
          content: ocrEntry.content,
          isCompleted:
            ocrEntry.action === "complete" ? true : ocrEntry.isCompleted,
        };
      }
      break;
    }
  }
};
