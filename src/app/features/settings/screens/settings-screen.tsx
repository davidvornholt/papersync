"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { syncSettingsToVault } from "@/app/features/vault/actions/sync-settings";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Modal,
  PageTransition,
  Spinner,
  StaggerContainer,
  StaggerItem,
  useToast,
} from "@/app/shared/components";
import {
  DAYS_OF_WEEK,
  type DayOfWeek,
  type Subject,
  type TimetableDay,
  useSettings,
} from "@/app/shared/hooks/use-settings";
import type { GitHubRepository } from "../actions/github-oauth";
import { GitHubOAuthModal } from "../components/github-oauth-modal";
import { RepositorySelectorModal } from "../components/repository-selector-modal";
import { useGitHubOAuth } from "../hooks/use-github-oauth";

// ============================================================================
// Constants
// ============================================================================

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const DAY_SHORT_LABELS: Record<DayOfWeek, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

// ============================================================================
// Toggle Button Component
// ============================================================================

type ToggleOption = {
  readonly value: string;
  readonly label: string;
  readonly description: string;
  readonly icon: React.ReactNode;
};

type ToggleButtonsProps = {
  readonly options: readonly ToggleOption[];
  readonly value: string;
  readonly onChange: (value: string) => void;
};

const ToggleButtons = ({
  options,
  value,
  onChange,
}: ToggleButtonsProps): React.ReactElement => (
  <div className="flex gap-3">
    {options.map((option) => (
      <motion.button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
          value === option.value
            ? "border-accent bg-accent/5"
            : "border-border hover:border-muted"
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              value === option.value
                ? "bg-accent text-white"
                : "bg-background text-muted"
            }`}
          >
            {option.icon}
          </div>
          <p className="font-medium text-foreground">{option.label}</p>
        </div>
        <p className="text-sm text-muted">{option.description}</p>
      </motion.button>
    ))}
  </div>
);

// ============================================================================
// Input Component
// ============================================================================

type InputFieldProps = {
  readonly id: string;
  readonly label: string;
  readonly type?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
};

const InputField = ({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
}: InputFieldProps): React.ReactElement => (
  <div>
    <label
      htmlFor={id}
      className="block text-sm font-medium text-foreground mb-2"
    >
      {label}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
      placeholder={placeholder}
    />
  </div>
);

// ============================================================================
// Subject List Item
// ============================================================================

type SubjectListItemProps = {
  readonly subject: Subject;
  readonly onEdit: (id: string) => void;
  readonly onDelete: (id: string) => void;
};

const SubjectListItem = ({
  subject,
  onEdit,
  onDelete,
}: SubjectListItemProps): React.ReactElement => (
  <motion.li
    layout
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 10, height: 0 }}
    className="flex items-center justify-between p-3 bg-background rounded-lg border border-border group hover:border-accent/30 transition-colors"
  >
    <span className="text-foreground font-medium">{subject.name}</span>
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        type="button"
        onClick={() => onEdit(subject.id)}
        className="p-2 text-muted hover:text-accent rounded transition-colors"
        title="Edit"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <title>Edit</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onDelete(subject.id)}
        className="p-2 text-muted hover:text-red-500 rounded transition-colors"
        title="Delete"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <title>Delete</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  </motion.li>
);

// ============================================================================
// Add Subject Modal
// ============================================================================

type AddSubjectModalProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onAdd: (name: string) => void;
  readonly editingSubject?: Subject | null;
  readonly onEdit?: (id: string, name: string) => void;
  readonly existingSubjects: readonly Subject[];
};

const AddSubjectModal = ({
  isOpen,
  onClose,
  onAdd,
  editingSubject,
  onEdit,
  existingSubjects,
}: AddSubjectModalProps): React.ReactElement => {
  const [name, setName] = useState(editingSubject?.name ?? "");

  const isDuplicate = useCallback(
    (newName: string): boolean => {
      const normalizedName = newName.trim().toLowerCase();
      return existingSubjects.some(
        (subject) =>
          subject.name.toLowerCase() === normalizedName &&
          subject.id !== editingSubject?.id
      );
    },
    [existingSubjects, editingSubject?.id]
  );

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    const trimmedName = name.trim();
    
    if (!trimmedName || isDuplicate(trimmedName)) return;
    
    if (editingSubject && onEdit) {
      onEdit(editingSubject.id, trimmedName);
    } else {
      onAdd(trimmedName);
    }
    setName("");
    onClose();
  };

  // Reset name when modal opens or when editing subject changes
  useEffect(() => {
    if (isOpen) {
      setName(editingSubject?.name ?? "");
    }
  }, [isOpen, editingSubject]);

  // Check for duplicate in real-time
  const hasDuplicate = name.trim() !== "" && isDuplicate(name);
  
  // Show error when there's a duplicate (and it's not the same as the original name)
  const showError = hasDuplicate && name.trim().toLowerCase() !== (editingSubject?.name ?? "").toLowerCase();

  const isValid = name.trim() && !hasDuplicate;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setName("");
        onClose();
      }}
      title={editingSubject ? "Edit Subject" : "Add Subject"}
      size="sm"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setName("");
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!isValid} onClick={handleSubmit}>
            {editingSubject ? "Save Changes" : "Add Subject"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Subject name"
          className={`w-full px-4 py-3 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
            showError
              ? "border-red-500 focus:ring-red-500"
              : "border-border focus:ring-accent"
          }`}
        />
        {showError && (
          <p className="mt-2 text-sm text-red-500">
            A subject named "{name.trim()}" already exists
          </p>
        )}
      </form>
    </Modal>
  );
};

// ============================================================================
// Timetable Configuration Panel
// ============================================================================

type TimetableConfigPanelProps = {
  readonly subjects: readonly Subject[];
  readonly timetable: readonly TimetableDay[];
  readonly onAddSlot: (day: DayOfWeek, subjectId: string) => void;
  readonly onRemoveSlot: (day: DayOfWeek, slotId: string) => void;
  readonly onUpdateSlot: (
    day: DayOfWeek,
    slotId: string,
    subjectId: string,
  ) => void;
};

const TimetableConfigPanel = ({
  subjects,
  timetable,
  onAddSlot,
  onRemoveSlot,
  onUpdateSlot,
}: TimetableConfigPanelProps): React.ReactElement => {
  const [activeDay, setActiveDay] = useState<DayOfWeek>("monday");
  const activeSchedule = timetable.find((d) => d.day === activeDay);

  const handleAddSlot = (): void => {
    if (subjects.length > 0) {
      onAddSlot(activeDay, subjects[0].id);
    }
  };

  return (
    <div className="flex gap-4">
      {/* Day Tabs */}
      <div className="w-28 flex-shrink-0">
        <div className="space-y-1">
          {DAYS_OF_WEEK.map((day) => {
            const daySchedule = timetable.find((d) => d.day === day);
            const slotCount = daySchedule?.slots.length ?? 0;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setActiveDay(day)}
                className={`w-full px-3 py-2 rounded-lg text-left transition-all flex items-center justify-between ${
                  activeDay === day
                    ? "bg-accent text-white"
                    : "hover:bg-surface text-foreground"
                }`}
              >
                <span className="font-medium text-sm">
                  {DAY_SHORT_LABELS[day]}
                </span>
                {slotCount > 0 && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${activeDay === day ? "bg-white/20" : "bg-surface"}`}
                  >
                    {slotCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Schedule Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-foreground">
            {DAY_LABELS[activeDay]}
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddSlot}
            disabled={subjects.length === 0}
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>Add</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Class
          </Button>
        </div>

        {subjects.length === 0 ? (
          <div className="text-center py-6 text-muted border-2 border-dashed border-border rounded-lg">
            <p className="text-sm">Add subjects above first</p>
          </div>
        ) : !activeSchedule || activeSchedule.slots.length === 0 ? (
          <div className="text-center py-6 text-muted border-2 border-dashed border-border rounded-lg">
            <p className="text-sm">No classes on {DAY_LABELS[activeDay]}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={handleAddSlot}
            >
              Add your first class
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {activeSchedule?.slots.map((slot, index) => (
                <motion.div
                  key={slot.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border"
                >
                  <span className="text-xs text-muted bg-surface w-6 h-6 rounded flex items-center justify-center font-medium">
                    {index + 1}
                  </span>
                  <select
                    value={slot.subjectId}
                    onChange={(e) =>
                      onUpdateSlot(activeDay, slot.id, e.target.value)
                    }
                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onRemoveSlot(activeDay, slot.id)}
                    className="p-2 text-muted hover:text-red-500 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <title>Remove</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Settings Screen
// ============================================================================

export const SettingsScreen = (): React.ReactElement => {
  const {
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
  } = useSettings();

  const [isOAuthModalOpen, setIsOAuthModalOpen] = useState(false);
  const [isRepoSelectorOpen, setIsRepoSelectorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingVaultSettings, setIsLoadingVaultSettings] = useState(false);
  const [lastLoadedLocalPath, setLastLoadedLocalPath] = useState<string>("");

  const { addToast } = useToast();
  const {
    oauthState,
    startOAuth,
    cancelOAuth,
    reset: resetOAuth,
    isConfigured,
  } = useGitHubOAuth();

  const handleConnect = useCallback((): void => {
    resetOAuth();
    setIsOAuthModalOpen(true);
  }, [resetOAuth]);

  const handleOAuthSuccess = useCallback(
    async (accessToken: string): Promise<void> => {
      // Fetch GitHub user info
      const { getGitHubUser } = await import("../actions/github-oauth");
      const userResult = await getGitHubUser(accessToken);

      if (userResult.success) {
        // Store token and username persistently
        updateVault({
          githubConnected: true,
          githubUsername: userResult.login,
          githubToken: accessToken,
        });
        addToast(
          `Connected to GitHub as ${userResult.name || userResult.login}!`,
          "success",
        );
      } else {
        // Still store the connection, but without username
        updateVault({
          githubConnected: true,
          githubToken: accessToken,
        });
        addToast("Connected to GitHub successfully!", "success");
      }

      setIsOAuthModalOpen(false);

      // Open repository selector
      setIsRepoSelectorOpen(true);
    },
    [updateVault, addToast],
  );

  const handleOAuthModalClose = useCallback((): void => {
    cancelOAuth();
    setIsOAuthModalOpen(false);
  }, [cancelOAuth]);

  const handleRepoSelect = useCallback(
    async (repo: GitHubRepository): Promise<void> => {
      updateVault({ githubRepo: repo.fullName });
      setIsRepoSelectorOpen(false);

      // Try to load existing settings from the vault
      const { loadSettingsFromVault } = await import(
        "@/app/features/vault/actions/sync-settings"
      );

      const result = await loadSettingsFromVault("github", {
        githubToken: settings.vault.githubToken,
        githubRepo: repo.fullName,
      });

      if (result.success) {
        // Load subjects and timetable from vault if they exist
        if (result.subjects.length > 0) {
          setSubjects([...result.subjects] as Subject[]);
        }
        if (result.timetable.length > 0) {
          updateTimetable(result.timetable as TimetableDay[]);
        }
        addToast(
          `Connected to ${repo.fullName} and loaded settings from vault`,
          "success",
        );
      } else {
        // No existing settings in vault, that's okay
        addToast(`Selected repository: ${repo.fullName}`, "success");
      }
    },
    [
      updateVault,
      addToast,
      settings.vault.githubToken,
      setSubjects,
      updateTimetable,
    ],
  );

  const handleDisconnect = useCallback((): void => {
    updateVault({
      githubConnected: false,
      githubRepo: "",
      githubUsername: "",
      githubToken: "",
    });
    addToast("Disconnected from GitHub", "info");
  }, [updateVault, addToast]);

  // Load settings from local vault when path is set
  const handleLoadFromLocalVault = useCallback(
    async (localPath: string): Promise<void> => {
      if (!localPath || localPath === lastLoadedLocalPath) return;

      setIsLoadingVaultSettings(true);
      setLastLoadedLocalPath(localPath);

      try {
        const { loadSettingsFromVault } = await import(
          "@/app/features/vault/actions/sync-settings"
        );

        const result = await loadSettingsFromVault("local", { localPath });

        if (result.success) {
          // Load subjects and timetable from vault if they exist
          if (result.subjects.length > 0) {
            setSubjects([...result.subjects] as Subject[]);
          }
          if (result.timetable.length > 0) {
            updateTimetable(result.timetable as TimetableDay[]);
          }
          if (result.subjects.length > 0 || result.timetable.length > 0) {
            addToast("Loaded settings from vault", "success");
          }
        }
      } catch {
        // Vault might not exist yet, that's okay
      } finally {
        setIsLoadingVaultSettings(false);
      }
    },
    [
      lastLoadedLocalPath,
      addToast,
      setSubjects,
      updateTimetable,
    ],
  );

  // Automatically load settings when local vault path changes
  useEffect(() => {
    if (
      settings.vault.method === "local" &&
      settings.vault.localPath &&
      settings.vault.localPath !== lastLoadedLocalPath
    ) {
      handleLoadFromLocalVault(settings.vault.localPath);
    }
  }, [
    settings.vault.method,
    settings.vault.localPath,
    lastLoadedLocalPath,
    handleLoadFromLocalVault,
  ]);

  const handleDeleteSubject = (id: string): void => {
    const subject = settings.subjects.find((s) => s.id === id);
    removeSubject(id);
    if (subject) {
      addToast(`Deleted "${subject.name}"`, "info");
    }
  };

  const handleAddSubject = (name: string): void => {
    addSubject(name);
    addToast(`Added "${name}"`, "success");
  };

  const handleEditSubject = (id: string, name: string): void => {
    updateSubject(id, name);
    addToast(`Updated subject`, "success");
    setEditingSubject(null);
  };

  const isVaultConfigured =
    (settings.vault.method === "local" && settings.vault.localPath) ||
    (settings.vault.method === "github" &&
      settings.vault.githubConnected &&
      settings.vault.githubRepo);

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    await save();

    if (isVaultConfigured) {
      setIsSyncing(true);
      try {
        const result = await syncSettingsToVault(
          {
            subjects: settings.subjects,
            timetable: settings.timetable,
          },
          settings.vault.method,
          {
            localPath: settings.vault.localPath,
            githubToken: settings.vault.githubToken,
            githubRepo: settings.vault.githubRepo,
          },
        );

        if (result.success) {
          addToast("Settings saved and synced to vault!", "success");
        } else {
          addToast(
            `Settings saved, but sync failed: ${result.error}`,
            "warning",
          );
        }
      } catch (error) {
        addToast(
          `Settings saved, but sync failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          "warning",
        );
      } finally {
        setIsSyncing(false);
      }
    } else {
      addToast("Settings saved successfully!", "success");
    }

    setIsSaving(false);
  };

  const vaultOptions: ToggleOption[] = [
    {
      value: "local",
      label: "Local Filesystem",
      description: "Direct file system access",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <title>Local</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
      ),
    },
    {
      value: "github",
      label: "GitHub Repository",
      description: "Sync via Git",
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <title>GitHub</title>
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      ),
    },
  ];

  const aiOptions: ToggleOption[] = [
    {
      value: "google",
      label: "Google Gemini",
      description: "Cloud-based, highly accurate",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <title>Cloud</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
          />
        </svg>
      ),
    },
    {
      value: "ollama",
      label: "Ollama (Local)",
      description: "Privacy-first, runs locally",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <title>Local AI</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
    },
  ];

  // Count configured days
  const configuredDaysCount = settings.timetable.filter(
    (d) => d.slots.length > 0,
  ).length;

  if (isLoading) {
    return (
      <PageTransition>
        <div className="page-container flex items-center justify-center min-h-[400px]">
          <Spinner size="lg" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="page-container">
        {/* Header */}
        <header className="page-header">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent transition-colors group"
            >
              <svg
                className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>Back</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Dashboard
            </Link>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-foreground mt-2"
            >
              Settings
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-muted mt-1"
            >
              Configure PaperSync preferences
            </motion.p>
          </div>
        </header>

        <StaggerContainer className="max-w-3xl space-y-8">
          {/* Vault Connection */}
          <StaggerItem>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <title>Vault</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold font-display">
                      Obsidian Vault
                    </h2>
                    <p className="text-sm text-muted">
                      Connect to your knowledge base
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ToggleButtons
                  options={vaultOptions}
                  value={settings.vault.method}
                  onChange={(v) =>
                    updateVault({ method: v as "local" | "github" })
                  }
                />

                <AnimatePresence mode="wait">
                  {settings.vault.method === "local" ? (
                    <motion.div
                      key="local"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      <InputField
                        id="vault-path"
                        label="Vault Path"
                        value={settings.vault.localPath ?? ""}
                        onChange={(v) => updateVault({ localPath: v })}
                        placeholder="/path/to/your/vault"
                      />
                      {isLoadingVaultSettings && (
                        <div className="flex items-center gap-2 text-sm text-muted">
                          <Spinner size="sm" />
                          <span>Loading settings from vault...</span>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="github"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      {settings.vault.githubConnected ? (
                        <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg border border-accent/20">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white">
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <title>Connected</title>
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-foreground">
                                Connected to GitHub
                              </p>
                              <p className="text-sm text-muted">
                                @{settings.vault.githubUsername || "unknown"}
                              </p>
                              {settings.vault.githubRepo && (
                                <p className="text-xs text-accent mt-1">
                                  📁 {settings.vault.githubRepo}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setIsRepoSelectorOpen(true)}
                            >
                              {settings.vault.githubRepo
                                ? "Change Repo"
                                : "Select Repo"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleDisconnect}
                            >
                              Disconnect
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <motion.div
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <Button
                            onClick={handleConnect}
                            disabled={!isConfigured}
                            className="w-full"
                          >
                            <svg
                              className="w-5 h-5 mr-2"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <title>GitHub</title>
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            Connect with GitHub
                          </Button>
                          {!isConfigured && (
                            <p className="text-xs text-muted text-center mt-2">
                              GitHub OAuth not configured. Set
                              NEXT_PUBLIC_GITHUB_CLIENT_ID.
                            </p>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </StaggerItem>

          {/* AI Provider */}
          <StaggerItem>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <title>AI</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold font-display">
                      AI Provider
                    </h2>
                    <p className="text-sm text-muted">
                      Choose your vision/OCR engine
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ToggleButtons
                  options={aiOptions}
                  value={settings.ai.provider}
                  onChange={(v) =>
                    updateAI({ provider: v as "google" | "ollama" })
                  }
                />

                <AnimatePresence mode="wait">
                  {settings.ai.provider === "google" ? (
                    <motion.div
                      key="google"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <InputField
                        id="api-key"
                        label="API Key"
                        type="password"
                        value={settings.ai.googleApiKey ?? ""}
                        onChange={(v) => updateAI({ googleApiKey: v })}
                        placeholder="Enter your Gemini API key"
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="ollama"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <InputField
                        id="ollama-endpoint"
                        label="Ollama Endpoint"
                        value={settings.ai.ollamaEndpoint ?? ""}
                        onChange={(v) => updateAI({ ollamaEndpoint: v })}
                        placeholder="http://localhost:11434"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </StaggerItem>

          {/* Subjects & Timetable - Combined */}
          <StaggerItem>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <title>Subjects & Timetable</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold font-display">
                      Subjects & Timetable
                    </h2>
                    <p className="text-sm text-muted">
                      {isVaultConfigured ? (
                        <>
                          {settings.subjects.length} subject
                          {settings.subjects.length !== 1 ? "s" : ""} •{" "}
                          {configuredDaysCount} day
                          {configuredDaysCount !== 1 ? "s" : ""} configured
                        </>
                      ) : (
                        "Configure vault connection first"
                      )}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isVaultConfigured ? (
                  /* Vault not configured - show disabled state */
                  <div className="text-center py-8 text-muted border-2 border-dashed border-border rounded-lg bg-surface/50">
                    <svg
                      className="w-12 h-12 mx-auto mb-3 text-muted-light"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <title>Vault Required</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    <p className="font-medium text-foreground mb-1">
                      Vault Connection Required
                    </p>
                    <p className="text-sm max-w-sm mx-auto">
                      To configure subjects and timetables, first set up a local
                      vault path or connect to a GitHub repository above.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Subjects Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-foreground">
                          Subjects
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsSubjectModalOpen(true)}
                        >
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <title>Add</title>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
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
                              onEdit={(id) => {
                                const s = settings.subjects.find(
                                  (s) => s.id === id,
                                );
                                if (s) {
                                  setEditingSubject(s);
                                  setIsSubjectModalOpen(true);
                                }
                              }}
                              onDelete={handleDeleteSubject}
                            />
                          ))}
                        </AnimatePresence>
                      </ul>
                      {settings.subjects.length === 0 && (
                        <div className="text-center py-6 text-muted border-2 border-dashed border-border rounded-lg">
                          <p className="text-sm">No subjects yet</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={() => setIsSubjectModalOpen(true)}
                          >
                            Add your first subject
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border" />

                    {/* Timetable Section */}
                    <div>
                      <div className="mb-3">
                        <h3 className="font-medium text-foreground">
                          Weekly Schedule
                        </h3>
                        <p className="text-sm text-muted">
                          Configure your regular class schedule
                        </p>
                      </div>
                      <TimetableConfigPanel
                        subjects={settings.subjects}
                        timetable={settings.timetable}
                        onAddSlot={addTimetableSlot}
                        onRemoveSlot={removeTimetableSlot}
                        onUpdateSlot={updateTimetableSlot}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </StaggerItem>

          {/* Save Button */}
          <StaggerItem>
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                size="lg"
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    {isSyncing ? "Syncing to vault..." : "Saving..."}
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <title>Save</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Save All Settings
                  </>
                )}
              </Button>
            </motion.div>
            <p className="text-xs text-muted text-center mt-2">
              {isVaultConfigured
                ? "Saves all settings locally and syncs subjects & timetable to vault"
                : "Saves all settings locally"}
            </p>
          </StaggerItem>
        </StaggerContainer>
      </div>

      {/* Modals */}
      <AddSubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => {
          setIsSubjectModalOpen(false);
          setEditingSubject(null);
        }}
        onAdd={handleAddSubject}
        editingSubject={editingSubject}
        onEdit={handleEditSubject}
        existingSubjects={settings.subjects}
      />

      <GitHubOAuthModal
        isOpen={isOAuthModalOpen}
        onClose={handleOAuthModalClose}
        onSuccess={handleOAuthSuccess}
        oauthState={oauthState}
        onStartOAuth={startOAuth}
        onCancel={cancelOAuth}
      />

      <RepositorySelectorModal
        isOpen={isRepoSelectorOpen}
        onClose={() => setIsRepoSelectorOpen(false)}
        onSelect={handleRepoSelect}
        accessToken={settings.vault.githubToken || ""}
      />
    </PageTransition>
  );
};
