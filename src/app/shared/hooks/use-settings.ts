"use client";

import { Effect } from "effect";
import * as S from "effect/Schema";
import { useCallback, useEffect, useState } from "react";

// ============================================================================
// Settings Schema
// ============================================================================

const VaultMethodSchema = S.Union(S.Literal("local"), S.Literal("github"));
const AIProviderSchema = S.Union(S.Literal("google"), S.Literal("ollama"));

const SubjectSchema = S.Struct({
  id: S.String,
  name: S.String,
  order: S.optional(S.Number),
});

const SettingsSchema = S.Struct({
  vault: S.Struct({
    method: VaultMethodSchema,
    localPath: S.optional(S.String),
    githubConnected: S.optional(S.Boolean),
    githubRepo: S.optional(S.String),
  }),
  ai: S.Struct({
    provider: AIProviderSchema,
    googleApiKey: S.optional(S.String),
    ollamaEndpoint: S.optional(S.String),
  }),
  subjects: S.Array(SubjectSchema),
});

type Settings = S.Schema.Type<typeof SettingsSchema>;
type VaultMethod = S.Schema.Type<typeof VaultMethodSchema>;
type AIProvider = S.Schema.Type<typeof AIProviderSchema>;
type Subject = S.Schema.Type<typeof SubjectSchema>;

// ============================================================================
// Default Settings
// ============================================================================

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
    { id: "1", name: "Mathematics", order: 1 },
    { id: "2", name: "Physics", order: 2 },
    { id: "3", name: "Chemistry", order: 3 },
    { id: "4", name: "Literature", order: 4 },
  ],
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
  readonly addSubject: (name: string) => void;
  readonly removeSubject: (id: string) => void;
  readonly updateSubject: (id: string, name: string) => void;
  readonly reorderSubjects: (subjects: Subject[]) => void;
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

  const addSubject = useCallback((name: string): void => {
    setSettings((prev) => ({
      ...prev,
      subjects: [
        ...prev.subjects,
        {
          id: `subj-${Date.now()}`,
          name,
          order: prev.subjects.length + 1,
        },
      ],
    }));
  }, []);

  const removeSubject = useCallback((id: string): void => {
    setSettings((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s.id !== id),
    }));
  }, []);

  const updateSubject = useCallback((id: string, name: string): void => {
    setSettings((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s) => (s.id === id ? { ...s, name } : s)),
    }));
  }, []);

  const reorderSubjects = useCallback((subjects: Subject[]): void => {
    setSettings((prev) => ({
      ...prev,
      subjects,
    }));
  }, []);

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
    reorderSubjects,
    save,
    reset,
  };
};

// Re-export types
export type { Settings, VaultMethod, AIProvider, Subject };
