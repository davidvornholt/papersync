"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  PageTransition,
  Spinner,
  StaggerContainer,
  StaggerItem,
  useToast,
} from "@/app/shared/components";

// ============================================================================
// Types
// ============================================================================

type VaultMethod = "local" | "github";
type AIProvider = "google" | "ollama";

type Subject = {
  readonly id: string;
  readonly name: string;
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
    <span className="text-foreground">{subject.name}</span>
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
// Settings Screen
// ============================================================================

const initialSubjects: Subject[] = [
  { id: "1", name: "Mathematics" },
  { id: "2", name: "Physics" },
  { id: "3", name: "Chemistry" },
  { id: "4", name: "Literature" },
];

export const SettingsScreen = (): React.ReactElement => {
  const [vaultMethod, setVaultMethod] = useState<VaultMethod>("local");
  const [vaultPath, setVaultPath] = useState("/home/user/Obsidian/Vault");
  const [aiProvider, setAIProvider] = useState<AIProvider>("google");
  const [apiKey, setApiKey] = useState("");
  const [ollamaEndpoint, setOllamaEndpoint] = useState(
    "http://localhost:11434",
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();

  const handleConnect = async (): Promise<void> => {
    setIsConnecting(true);
    // TODO: Wire up actual GitHub OAuth
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsConnecting(false);
    setIsConnected(true);
    addToast("Connected to GitHub successfully!", "success");
  };

  const handleDisconnect = (): void => {
    setIsConnected(false);
    addToast("Disconnected from GitHub", "info");
  };

  const handleDeleteSubject = (id: string): void => {
    const subject = subjects.find((s) => s.id === id);
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    if (subject) {
      addToast(`Deleted "${subject.name}"`, "info");
    }
  };

  const handleAddSubject = (): void => {
    const name = prompt("Enter subject name:");
    if (name?.trim()) {
      const newSubject: Subject = {
        id: `subj-${Date.now()}`,
        name: name.trim(),
      };
      setSubjects((prev) => [...prev, newSubject]);
      addToast(`Added "${name.trim()}"`, "success");
    }
  };

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    // TODO: Wire up actual settings persistence
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    addToast("Settings saved successfully!", "success");
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

        <StaggerContainer className="max-w-2xl space-y-8">
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
                  value={vaultMethod}
                  onChange={(v) => setVaultMethod(v as VaultMethod)}
                />

                <AnimatePresence mode="wait">
                  {vaultMethod === "local" ? (
                    <motion.div
                      key="local"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <InputField
                        id="vault-path"
                        label="Vault Path"
                        value={vaultPath}
                        onChange={setVaultPath}
                        placeholder="/path/to/your/vault"
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="github"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      {isConnected ? (
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
                            <div>
                              <p className="font-medium text-foreground">
                                Connected to GitHub
                              </p>
                              <p className="text-sm text-muted">
                                user/obsidian-vault
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleDisconnect}
                          >
                            Disconnect
                          </Button>
                        </div>
                      ) : (
                        <motion.div
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <Button
                            onClick={handleConnect}
                            disabled={isConnecting}
                            className="w-full"
                          >
                            {isConnecting ? (
                              <>
                                <Spinner size="sm" className="mr-2" />
                                Connecting...
                              </>
                            ) : (
                              <>
                                <svg
                                  className="w-5 h-5 mr-2"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <title>GitHub</title>
                                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                                Connect with GitHub
                              </>
                            )}
                          </Button>
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
                  value={aiProvider}
                  onChange={(v) => setAIProvider(v as AIProvider)}
                />

                <AnimatePresence mode="wait">
                  {aiProvider === "google" ? (
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
                        value={apiKey}
                        onChange={setApiKey}
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
                        value={ollamaEndpoint}
                        onChange={setOllamaEndpoint}
                        placeholder="http://localhost:11434"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </StaggerItem>

          {/* Subjects */}
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
                      <title>Subjects</title>
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
                      Subjects
                    </h2>
                    <p className="text-sm text-muted">
                      Configure subjects for your planner
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-4">
                  <AnimatePresence>
                    {subjects.map((subject) => (
                      <SubjectListItem
                        key={subject.id}
                        subject={subject}
                        onEdit={() => {}}
                        onDelete={handleDeleteSubject}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleAddSubject}
                >
                  <svg
                    className="w-4 h-4 mr-2"
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
                    Saving...
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
                    Save Settings
                  </>
                )}
              </Button>
            </motion.div>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </PageTransition>
  );
};
