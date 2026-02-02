"use client";

import { Effect } from "effect";
import * as S from "effect/Schema";
import { useCallback, useEffect, useState } from "react";

// ============================================================================
// Settings Schema
// ============================================================================

const VaultMethodSchema = S.Union(S.Literal("local"), S.Literal("github"));
const AIProviderSchema = S.Union(S.Literal("google"), S.Literal("ollama"));

const DayOfWeekSchema = S.Union(
  S.Literal("monday"),
  S.Literal("tuesday"),
  S.Literal("wednesday"),
  S.Literal("thursday"),
  S.Literal("friday"),
  S.Literal("saturday"),
  S.Literal("sunday"),
);

const SubjectSchema = S.Struct({
  id: S.String,
  name: S.String,
  color: S.optional(S.String),
});

const TimetableSlotSchema = S.Struct({
  id: S.String,
  subjectId: S.String,
});

const TimetableDaySchema = S.Struct({
  day: DayOfWeekSchema,
  slots: S.Array(TimetableSlotSchema),
});

const SettingsSchema = S.Struct({
  vault: S.Struct({
    method: VaultMethodSchema,
    localPath: S.optional(S.String),
    githubConnected: S.optional(S.Boolean),
    githubRepo: S.optional(S.String),
    githubUsername: S.optional(S.String),
    githubToken: S.optional(S.String),
  }),
  ai: S.Struct({
    provider: AIProviderSchema,
    googleApiKey: S.optional(S.String),
    ollamaEndpoint: S.optional(S.String),
  }),
  subjects: S.Array(SubjectSchema),
  timetable: S.Array(TimetableDaySchema),
});

type Settings = S.Schema.Type<typeof SettingsSchema>;
type VaultMethod = S.Schema.Type<typeof VaultMethodSchema>;
type AIProvider = S.Schema.Type<typeof AIProviderSchema>;
type Subject = S.Schema.Type<typeof SubjectSchema>;
type DayOfWeek = S.Schema.Type<typeof DayOfWeekSchema>;
type TimetableSlot = S.Schema.Type<typeof TimetableSlotSchema>;
type TimetableDay = S.Schema.Type<typeof TimetableDaySchema>;

// ============================================================================
// Constants
// ============================================================================

const DAYS_OF_WEEK: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

// ============================================================================
// Default Settings
// ============================================================================

const createDefaultTimetable = (): TimetableDay[] =>
  DAYS_OF_WEEK.map((day) => ({ day, slots: [] }));

const defaultSettings: Settings = {
  vault: {
    method: "local",
    localPath: "",
    githubConnected: false,
    githubRepo: "",
  },
  ai: {
    provider: "google",
    googleApiKey: "",
    ollamaEndpoint: "http://localhost:11434",
  },
  subjects: [
    { id: "1", name: "Chemistry" },
    { id: "2", name: "Literature" },
    { id: "3", name: "Mathematics" },
    { id: "4", name: "Physics" },
  ],
  timetable: createDefaultTimetable(),
};

// ============================================================================
// Storage Key
// ============================================================================

const STORAGE_KEY = "papersync-settings";

// ============================================================================
// Load/Save Functions
// ============================================================================

const loadSettings = (): Effect.Effect<Settings, never> =>
  Effect.sync(() => {
    if (typeof window === "undefined") return defaultSettings;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return defaultSettings;

      const parsed = JSON.parse(stored);
      // Ensure timetable exists (migration for old settings)
      if (!parsed.timetable) {
        parsed.timetable = createDefaultTimetable();
      }
      const decoded = S.decodeUnknownSync(SettingsSchema)(parsed);
      return decoded;
    } catch {
      return defaultSettings;
    }
  });

const saveSettings = (settings: Settings): Effect.Effect<void, never> =>
  Effect.sync(() => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      console.error("Failed to save settings to localStorage");
    }
  });

// ============================================================================
// Hook
// ============================================================================

export type UseSettingsReturn = {
  readonly settings: Settings;
  readonly isLoading: boolean;
  readonly updateVault: (updates: Partial<Settings["vault"]>) => void;
  readonly updateAI: (updates: Partial<Settings["ai"]>) => void;
  // Subject management
  readonly addSubject: (name: string) => void;
  readonly removeSubject: (id: string) => void;
  readonly updateSubject: (id: string, name: string) => void;
  readonly setSubjects: (subjects: Subject[]) => void;
  // Timetable management
  readonly updateTimetable: (timetable: TimetableDay[]) => void;
  readonly addTimetableSlot: (day: DayOfWeek, subjectId: string) => void;
  readonly removeTimetableSlot: (day: DayOfWeek, slotId: string) => void;
  readonly updateTimetableSlot: (
    day: DayOfWeek,
    slotId: string,
    subjectId: string,
  ) => void;
  // Persistence
  readonly save: () => Promise<void>;
  readonly reset: () => void;
};

export const useSettings = (): UseSettingsReturn => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    Effect.runPromise(loadSettings()).then((loaded) => {
      setSettings(loaded);
      setIsLoading(false);
    });
  }, []);



  const updateVault = useCallback(
    (updates: Partial<Settings["vault"]>): void => {
      setSettings((prev) => ({
        ...prev,
        vault: { ...prev.vault, ...updates },
      }));
    },
    [],
  );

  const updateAI = useCallback((updates: Partial<Settings["ai"]>): void => {
    setSettings((prev) => ({
      ...prev,
      ai: { ...prev.ai, ...updates },
    }));
  }, []);

  // Subject management
  const addSubject = useCallback((name: string): void => {
    setSettings((prev) => ({
      ...prev,
      subjects: [
        ...prev.subjects,
        {
          id: `subj-${Date.now()}`,
          name,
        },
      ],
    }));
  }, []);

  const removeSubject = useCallback((id: string): void => {
    setSettings((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s.id !== id),
      // Also remove from timetable
      timetable: prev.timetable.map((day) => ({
        ...day,
        slots: day.slots.filter((slot) => slot.subjectId !== id),
      })),
    }));
  }, []);

  const updateSubject = useCallback((id: string, name: string): void => {
    setSettings((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s) => (s.id === id ? { ...s, name } : s)),
    }));
  }, []);

  const setSubjects = useCallback((subjects: Subject[]): void => {
    setSettings((prev) => ({
      ...prev,
      subjects,
    }));
  }, []);

  // Timetable management
  const updateTimetable = useCallback((timetable: TimetableDay[]): void => {
    setSettings((prev) => ({
      ...prev,
      timetable,
    }));
  }, []);

  const addTimetableSlot = useCallback(
    (day: DayOfWeek, subjectId: string): void => {
      setSettings((prev) => ({
        ...prev,
        timetable: prev.timetable.map((d) =>
          d.day === day
            ? {
                ...d,
                slots: [...d.slots, { id: `slot-${Date.now()}`, subjectId }],
              }
            : d,
        ),
      }));
    },
    [],
  );

  const removeTimetableSlot = useCallback(
    (day: DayOfWeek, slotId: string): void => {
      setSettings((prev) => ({
        ...prev,
        timetable: prev.timetable.map((d) =>
          d.day === day
            ? { ...d, slots: d.slots.filter((s) => s.id !== slotId) }
            : d,
        ),
      }));
    },
    [],
  );

  const updateTimetableSlot = useCallback(
    (day: DayOfWeek, slotId: string, subjectId: string): void => {
      setSettings((prev) => ({
        ...prev,
        timetable: prev.timetable.map((d) =>
          d.day === day
            ? {
                ...d,
                slots: d.slots.map((s) =>
                  s.id === slotId ? { ...s, subjectId } : s,
                ),
              }
            : d,
        ),
      }));
    },
    [],
  );

  const save = useCallback(async (): Promise<void> => {
    await Effect.runPromise(saveSettings(settings));
  }, [settings]);

  const reset = useCallback((): void => {
    setSettings(defaultSettings);
    Effect.runPromise(saveSettings(defaultSettings));
  }, []);

  return {
    settings,
    isLoading,
    updateVault,
    updateAI,
    addSubject,
    removeSubject,
    updateSubject,
    setSubjects,
    updateTimetable,
    addTimetableSlot,
    removeTimetableSlot,
    updateTimetableSlot,
    save,
    reset,
  };
};

// Re-export types
export type {
  Settings,
  VaultMethod,
  AIProvider,
  Subject,
  DayOfWeek,
  TimetableSlot,
  TimetableDay,
};

// Export constants
export { DAYS_OF_WEEK };
