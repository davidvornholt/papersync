"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { syncToVault } from "@/app/features/vault/actions";
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
import { useSettings } from "@/app/shared/hooks";
import { discoverScanners, scanFromDevice } from "../actions";
import { type ExtractedEntry, useScan } from "../hooks";
import type { ColorMode, DiscoveredScanner } from "../services";

// ============================================================================
// Drag Drop Zone
// ============================================================================

type DragDropZoneProps = {
  readonly onFileSelect: (file: File) => void;
  readonly isDragging: boolean;
  readonly setIsDragging: (dragging: boolean) => void;
};

const DragDropZone = ({
  onFileSelect,
  isDragging,
  setIsDragging,
}: DragDropZoneProps): React.ReactElement => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith("image/")) {
        onFileSelect(file);
      }
    },
    [onFileSelect, setIsDragging],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <motion.button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`w-full border-2 border-dashed rounded-xl p-12 transition-all duration-300 cursor-pointer ${
        isDragging
          ? "border-accent bg-accent/5 scale-[1.02]"
          : "border-border hover:border-accent/50 hover:bg-surface"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
        }}
        className="hidden"
        aria-label="Select planner image"
      />
      <div className="text-center">
        <motion.div
          animate={
            isDragging ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }
          }
          className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center"
        >
          <svg
            className={`w-8 h-8 transition-colors ${isDragging ? "text-accent" : "text-muted-light"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <title>Upload</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </motion.div>
        <p className="text-foreground font-medium">
          {isDragging ? "Drop image here" : "Click to upload image"}
        </p>
        <p className="mt-1 text-sm text-muted">or drag and drop your scan</p>
        <p className="mt-4 text-xs text-muted-light">
          Supports JPG, PNG, HEIC • Max 10MB
        </p>
      </div>
    </motion.button>
  );
};

// ============================================================================
// Image Preview
// ============================================================================

type ImagePreviewProps = {
  readonly preview: string;
  readonly onClear: () => void;
  readonly onProcess: () => void;
  readonly isProcessing: boolean;
};

const ImagePreview = ({
  preview,
  onClear,
  onProcess,
  isProcessing,
}: ImagePreviewProps): React.ReactElement => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-4"
  >
    <div className="relative rounded-xl overflow-hidden border border-border group">
      <Image
        src={preview}
        alt="Scanned planner preview"
        className="w-full h-auto"
        width={800}
        height={600}
        unoptimized
      />
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
        <Button variant="secondary" size="sm" onClick={onClear}>
          Change Image
        </Button>
      </div>
    </div>
    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
      <Button
        onClick={onProcess}
        disabled={isProcessing}
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Spinner size="sm" className="mr-2" />
            Analyzing...
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>Scan</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Process Scan
          </>
        )}
      </Button>
    </motion.div>
  </motion.div>
);

// ============================================================================
// Extracted Entry Component
// ============================================================================

type ExtractedEntryItemProps = {
  readonly entry: ExtractedEntry;
  readonly index: number;
};

const ExtractedEntryItem = ({
  entry,
  index,
}: ExtractedEntryItemProps): React.ReactElement => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.1 }}
    className="p-4 bg-background rounded-lg border border-border hover:border-accent/30 transition-colors"
  >
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-accent/10 text-accent">
            {entry.subject}
          </span>
          <span className="text-xs text-muted">{entry.day}</span>
          {entry.isNew && (
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-green-500/10 text-green-600">
              NEW
            </span>
          )}
        </div>
        <p className="text-sm text-foreground">{entry.content}</p>
      </div>
    </div>
  </motion.div>
);

// ============================================================================
// Results Panel
// ============================================================================

type ResultsPanelState =
  | "idle"
  | "uploading"
  | "processing"
  | "complete"
  | "error";

type ResultsPanelProps = {
  readonly state: ResultsPanelState;
  readonly entries: readonly ExtractedEntry[];
  readonly confidence: number;
  readonly onSync: () => void;
  readonly _errorMessage?: string;
};

const ResultsPanel = ({
  state,
  entries,
  confidence,
  onSync,
  _errorMessage,
}: ResultsPanelProps): React.ReactElement => (
  <Card elevated className="h-full">
    <CardHeader>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <title>Results</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold font-display">
            Extraction Results
          </h2>
          <p className="text-sm text-muted">Detected handwritten entries</p>
        </div>
      </div>
    </CardHeader>
    <CardContent className="min-h-[400px]">
      <AnimatePresence mode="wait">
        {state === "complete" && entries.length > 0 && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-accent/10 rounded-lg border border-accent/20"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-accent">
                    ✓ {entries.length} entr{entries.length === 1 ? "y" : "ies"}{" "}
                    extracted
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    Confidence: {Math.round(confidence * 100)}%
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-accent">
                    {Math.round(confidence * 100)}
                  </span>
                </div>
              </div>
            </motion.div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {entries.map((entry, index) => (
                <ExtractedEntryItem
                  key={entry.id}
                  entry={entry}
                  index={index}
                />
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Button onClick={onSync} className="w-full" size="lg">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <title>Sync</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Sync to Vault
              </Button>
            </motion.div>
          </motion.div>
        )}

        {state === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-full py-16"
          >
            <div className="relative">
              <Spinner size="lg" />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-accent/20"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              />
            </div>
            <p className="mt-4 text-foreground font-medium">
              Analyzing handwriting...
            </p>
            <p className="text-sm text-muted mt-1">This may take a moment</p>
          </motion.div>
        )}

        {(state === "idle" || state === "uploading") && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-full py-16 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-muted-light"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>Waiting</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                />
              </svg>
            </div>
            <p className="text-muted">Upload a scan to see extracted content</p>
            <p className="text-sm text-muted-light mt-1">
              AI will detect and extract handwritten entries
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </CardContent>
  </Card>
);

// ============================================================================
// Network Scanners Panel
// ============================================================================

type NetworkScannersPanelProps = {
  readonly onScanComplete: (imageData: string) => void;
  readonly isDisabled: boolean;
};

const NetworkScannersPanel = ({
  onScanComplete,
  isDisabled,
}: NetworkScannersPanelProps): React.ReactElement => {
  const [scanners, setScanners] = useState<DiscoveredScanner[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [selectedScanner, setSelectedScanner] =
    useState<DiscoveredScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [resolution, setResolution] = useState<number>(300);
  const [colorMode, setColorMode] = useState<ColorMode>("color");
  const { addToast } = useToast();

  const handleDiscover = useCallback(async () => {
    setIsDiscovering(true);
    const result = await discoverScanners(5000);
    setIsDiscovering(false);

    if (result.success) {
      setScanners([...result.scanners]);
      if (result.scanners.length === 0) {
        addToast("No scanners found on network", "info");
      } else {
        addToast(`Found ${result.scanners.length} scanner(s)`, "success");
      }
    } else {
      addToast(result.error, "error");
    }
  }, [addToast]);

  const handleScan = useCallback(async () => {
    if (!selectedScanner) return;

    setIsScanning(true);
    const result = await scanFromDevice(selectedScanner, {
      colorMode,
      resolution,
      format: "jpeg",
    });
    setIsScanning(false);

    if (result.success) {
      onScanComplete(result.imageData);
      addToast("Scan completed successfully", "success");
    } else {
      addToast(result.error, "error");
    }
  }, [selectedScanner, colorMode, resolution, onScanComplete, addToast]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>Scanner</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold font-display">
                Network Scanners
              </h2>
              <p className="text-sm text-muted">
                {scanners.length} scanner(s) found
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDiscover}
            disabled={isDiscovering || isDisabled}
          >
            {isDiscovering ? (
              <>
                <Spinner size="sm" className="mr-2" /> Searching...
              </>
            ) : (
              "Discover"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {scanners.length === 0 ? (
          <div className="text-center py-6 text-muted">
            <svg
              className="w-12 h-12 mx-auto mb-3 opacity-30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>No Scanners</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
              />
            </svg>
            <p className="text-sm">
              Click "Discover" to find AirScan/eSCL compatible scanners
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Scanner list */}
            <div className="space-y-2">
              {scanners.map((scanner) => (
                <motion.button
                  key={scanner.id}
                  type="button"
                  onClick={() => setSelectedScanner(scanner)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    selectedScanner?.id === scanner.id
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{scanner.name}</p>
                      <p className="text-sm text-muted">
                        {scanner.host}:{scanner.port}
                      </p>
                    </div>
                    <div
                      className={`w-2 h-2 rounded-full ${selectedScanner?.id === scanner.id ? "bg-accent" : "bg-muted-light"}`}
                    />
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Scan settings */}
            {selectedScanner && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="pt-4 border-t border-border space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="resolution"
                      className="text-sm text-muted block mb-1"
                    >
                      Resolution
                    </label>
                    <select
                      id="resolution"
                      value={resolution}
                      onChange={(e) => setResolution(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm"
                    >
                      <option value={150}>150 DPI</option>
                      <option value={300}>300 DPI</option>
                      <option value={600}>600 DPI</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="colorMode"
                      className="text-sm text-muted block mb-1"
                    >
                      Color Mode
                    </label>
                    <select
                      id="colorMode"
                      value={colorMode}
                      onChange={(e) =>
                        setColorMode(e.target.value as ColorMode)
                      }
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm"
                    >
                      <option value="color">Color</option>
                      <option value="grayscale">Grayscale</option>
                      <option value="blackwhite">Black & White</option>
                    </select>
                  </div>
                </div>
                <Button
                  variant="primary"
                  onClick={handleScan}
                  disabled={isScanning || isDisabled}
                  className="w-full"
                >
                  {isScanning ? (
                    <>
                      <Spinner size="sm" className="mr-2" /> Scanning...
                    </>
                  ) : (
                    "Scan Document"
                  )}
                </Button>
              </motion.div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Scan Screen
// ============================================================================

export const ScanScreen = (): React.ReactElement => {
  const { settings } = useSettings();
  const scan = useScan({
    aiSettings: {
      provider: settings.ai.provider,
      googleApiKey: settings.ai.googleApiKey,
      ollamaEndpoint: settings.ai.ollamaEndpoint,
    },
  });
  const [isDragging, setIsDragging] = useState(false);
  const [, setIsSyncing] = useState(false);
  const { addToast } = useToast();

  // Map scan state to panel state
  const getPanelState = (): ResultsPanelState => {
    switch (scan.state.status) {
      case "processing":
        return "processing";
      case "complete":
        return "complete";
      case "error":
        return "error";
      case "uploading":
        return "uploading";
      default:
        return "idle";
    }
  };

  const handleFileSelect = async (file: File): Promise<void> => {
    await scan.upload(file);
    addToast("Image uploaded successfully", "success");
  };

  const handleProcess = async (): Promise<void> => {
    await scan.process();
    if (scan.state.status === "complete") {
      const count = scan.state.entries.length;
      addToast(`Extracted ${count} entries`, "success");
    } else if (scan.state.status === "error") {
      addToast("Failed to process scan", "error");
    }
  };

  const handleClear = (): void => {
    scan.clear();
  };

  const handleSync = async (): Promise<void> => {
    if (scan.state.status !== "complete") return;

    const vaultPath = settings.vault.localPath;
    if (!vaultPath) {
      addToast("Please configure your vault path in Settings", "error");
      return;
    }

    setIsSyncing(true);

    try {
      const result = await syncToVault(scan.state.entries, vaultPath);

      if (result.success) {
        addToast("Synced to vault successfully! 🎉", "success");
      } else {
        addToast(`Sync failed: ${result.error}`, "error");
      }
    } catch (error) {
      addToast(
        `Sync error: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error",
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle scan from network device - receives base64 image data
  const handleScanFromDevice = useCallback(
    async (imageData: string): Promise<void> => {
      // Convert base64 to blob and create a File object
      try {
        const response = await fetch(imageData);
        const blob = await response.blob();
        const file = new File([blob], "scanned-document.jpg", {
          type: blob.type,
        });
        await scan.upload(file);
        addToast(
          "Document scanned successfully! Click 'Process' to extract content.",
          "success",
        );
      } catch (error) {
        addToast(
          `Failed to process scanned image: ${error instanceof Error ? error.message : "Unknown error"}`,
          "error",
        );
      }
    },
    [scan, addToast],
  );

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
              Scan & Sync
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-muted mt-1"
            >
              Import handwritten notes with AI-powered extraction
            </motion.p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Panel */}
          <StaggerContainer className="space-y-6">
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
                        <title>Upload</title>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold font-display">
                        Upload Scan
                      </h2>
                      <p className="text-sm text-muted">
                        Select an image of your planner
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {!scan.imagePreview ? (
                    <DragDropZone
                      onFileSelect={handleFileSelect}
                      isDragging={isDragging}
                      setIsDragging={setIsDragging}
                    />
                  ) : (
                    <ImagePreview
                      preview={scan.imagePreview}
                      onClear={handleClear}
                      onProcess={handleProcess}
                      isProcessing={scan.state.status === "processing"}
                    />
                  )}
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <NetworkScannersPanel
                onScanComplete={handleScanFromDevice}
                isDisabled={scan.state.status === "processing"}
              />
            </StaggerItem>
          </StaggerContainer>

          {/* Results Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ResultsPanel
              state={getPanelState()}
              entries={
                scan.state.status === "complete" ? scan.state.entries : []
              }
              confidence={
                scan.state.status === "complete" ? scan.state.confidence : 0
              }
              onSync={handleSync}
              _errorMessage={
                scan.state.status === "error" ? scan.state.error : undefined
              }
            />
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};
