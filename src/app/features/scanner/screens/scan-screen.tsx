'use client';

import { AnimatePresence, motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { syncEntriesToVault } from '@/app/features/vault/actions';
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
} from '@/app/shared/components';
import { useSettings } from '@/app/shared/hooks';
import {
  discoverScanners,
  getScannerCapabilities,
  scanFromDevice,
} from '../actions';
import { type ExtractedEntry, useScan } from '../hooks';
import type {
  ColorMode,
  DiscoveredScanner,
  InputSource,
  ScannerCapabilities,
} from '../services';

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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
        // Reset the input so the same file can be selected again
        e.target.value = '';
      }
    },
    [onFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith('image/')) {
        onFileSelect(file);
      }
    },
    [onFileSelect, setIsDragging],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <section
      aria-label="Drop zone for planner images"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
      className={`w-full border-2 border-dashed rounded-xl p-8 transition-all duration-300 ${
        isDragging ? 'border-accent bg-accent/5 scale-[1.01]' : 'border-border'
      }`}
    >
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Take photo with camera"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Select image from device"
      />

      <div className="text-center">
        <motion.div
          animate={
            isDragging ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }
          }
          className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center"
        >
          <svg
            className={`w-8 h-8 transition-colors ${isDragging ? 'text-accent' : 'text-muted-light'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <title>Scan</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </motion.div>

        {isDragging ? (
          <p className="text-accent font-medium text-lg mb-6">
            Drop image here
          </p>
        ) : (
          <>
            <p className="text-foreground font-medium mb-2">
              Capture your planner
            </p>
            <p className="text-sm text-muted mb-6">
              Take a photo or upload an existing scan
            </p>
          </>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <motion.button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white font-medium rounded-lg hover:bg-accent/90 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>Camera</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Take Photo
          </motion.button>

          <motion.button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface border border-border text-foreground font-medium rounded-lg hover:bg-background hover:border-accent/50 transition-colors"
          >
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
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Upload Image
          </motion.button>
        </div>

        <p className="mt-6 text-xs text-muted-light">
          Supports JPG, PNG, HEIC • Drag & drop also supported
        </p>
      </div>
    </section>
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
// Extracted Entry Component (Editable)
// ============================================================================

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

type EditableEntryItemProps = {
  readonly entry: ExtractedEntry;
  readonly index: number;
  readonly onUpdate: (id: string, updates: Partial<ExtractedEntry>) => void;
  readonly onDelete: (id: string) => void;
};

const EditableEntryItem = ({
  entry,
  index,
  onUpdate,
  onDelete,
}: EditableEntryItemProps): React.ReactElement => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(entry.content);

  const handleSave = () => {
    onUpdate(entry.id, { content: editContent });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(entry.content);
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 bg-background rounded-lg border border-border hover:border-accent/30 transition-colors group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {entry.subject !== 'General Tasks' && (
              <select
                value={entry.day}
                onChange={(e) => onUpdate(entry.id, { day: e.target.value })}
                className="text-xs font-medium px-2 py-1 rounded bg-surface border border-border text-muted"
              >
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            )}
            <input
              type="text"
              value={entry.subject}
              onChange={(e) => onUpdate(entry.id, { subject: e.target.value })}
              className="text-xs font-medium px-2 py-1 rounded bg-accent/10 text-accent border-0 min-w-0 w-24"
              placeholder="Subject"
            />
            {entry.isNew && (
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-green-500/10 text-green-600">
                NEW
              </span>
            )}
          </div>
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full text-sm text-foreground bg-surface border border-border rounded-lg p-2 resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave}>
                  Save
                </Button>
                <Button size="sm" variant="secondary" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="text-sm text-foreground cursor-pointer hover:text-accent transition-colors text-left w-full"
              onClick={() => setIsEditing(true)}
              title="Click to edit"
            >
              {entry.content}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDelete(entry.id)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-500 transition-all"
          title="Delete entry"
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
    </motion.div>
  );
};

// ============================================================================
// Results Panel
// ============================================================================

type ResultsPanelState =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'complete'
  | 'error';

type ResultsPanelProps = {
  readonly state: ResultsPanelState;
  readonly entries: ExtractedEntry[];
  readonly confidence: number;
  readonly modelUsed?: string;
  readonly _errorMessage?: string;
  readonly onUpdateEntry: (
    id: string,
    updates: Partial<ExtractedEntry>,
  ) => void;
  readonly onDeleteEntry: (id: string) => void;
  readonly onSync: () => void;
  readonly isSyncing: boolean;
};

const ResultsPanel = ({
  state,
  entries,
  confidence,
  modelUsed,
  _errorMessage,
  onUpdateEntry,
  onDeleteEntry,
  onSync,
  isSyncing,
}: ResultsPanelProps): React.ReactElement => (
  <Card elevated className="h-full flex flex-col">
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
          <p className="text-sm text-muted">Review and edit before syncing</p>
        </div>
      </div>
    </CardHeader>
    <CardContent className="flex-1 flex flex-col min-h-0">
      <AnimatePresence mode="wait">
        {state === 'complete' && entries.length > 0 && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-accent/10 rounded-lg border border-accent/20 mb-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-accent">
                    ✓ {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}{' '}
                    extracted
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    Confidence: {Math.round(confidence * 100)}%
                    {modelUsed && ` · ${modelUsed}`}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-accent">
                    {Math.round(confidence * 100)}
                  </span>
                </div>
              </div>
            </motion.div>

            <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
              <AnimatePresence>
                {entries.map((entry, index) => (
                  <EditableEntryItem
                    key={entry.id}
                    entry={entry}
                    index={index}
                    onUpdate={onUpdateEntry}
                    onDelete={onDeleteEntry}
                  />
                ))}
              </AnimatePresence>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="pt-4 mt-4 border-t border-border"
            >
              <Button
                onClick={onSync}
                disabled={entries.length === 0 || isSyncing}
                className="w-full"
              >
                {isSyncing ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Syncing to Vault...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <title>Sync</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    Sync to Vault
                  </>
                )}
              </Button>
              <p className="text-xs text-muted text-center mt-2">
                Click to save entries to your Obsidian vault
              </p>
            </motion.div>
          </motion.div>
        )}

        {state === 'complete' && entries.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center flex-1 py-16 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-yellow-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>No entries</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-foreground font-medium">
              No new entries detected
            </p>
            <p className="text-sm text-muted mt-1">
              The scan may not contain handwritten content
            </p>
          </motion.div>
        )}

        {state === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center flex-1 py-16"
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

        {(state === 'idle' || state === 'uploading') && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center flex-1 py-16 text-center"
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
  const [isLoadingCapabilities, setIsLoadingCapabilities] = useState(false);
  const [capabilities, setCapabilities] = useState<ScannerCapabilities | null>(
    null,
  );
  const [resolution, setResolution] = useState<number>(300);
  const [colorMode, setColorMode] = useState<ColorMode>('color');
  const [inputSource, setInputSource] = useState<InputSource>('Platen');
  const { addToast } = useToast();

  const handleDiscover = useCallback(async () => {
    setIsDiscovering(true);
    const result = await discoverScanners(10000);
    setIsDiscovering(false);

    if (result.success) {
      setScanners([...result.scanners]);
      if (result.scanners.length === 0) {
        addToast('No scanners found on network', 'info');
      } else {
        addToast(`Found ${result.scanners.length} scanner(s)`, 'success');
      }
    } else {
      addToast(result.error, 'error');
    }
  }, [addToast]);

  const handleSelectScanner = useCallback(
    async (scanner: DiscoveredScanner) => {
      setSelectedScanner(scanner);
      setCapabilities(null);
      setIsLoadingCapabilities(true);

      const result = await getScannerCapabilities(scanner);
      setIsLoadingCapabilities(false);

      if (result.success) {
        setCapabilities(result.capabilities);
        // Set defaults from first available input source
        const firstSource = result.capabilities.inputSources[0] || 'Platen';
        setInputSource(firstSource);

        // Set resolution from the first source's capabilities
        const sourceCaps = result.capabilities.sourceCapabilities[firstSource];
        if (sourceCaps.resolutions.length > 0) {
          // Prefer 300 DPI if available, otherwise use first available
          const preferredRes = sourceCaps.resolutions.includes(300)
            ? 300
            : sourceCaps.resolutions[0];
          setResolution(preferredRes);
        }
        if (sourceCaps.colorModes.length > 0) {
          setColorMode(sourceCaps.colorModes[0]);
        }
      } else {
        addToast(`Failed to fetch capabilities: ${result.error}`, 'error');
      }
    },
    [addToast],
  );

  // When input source changes, update resolution and color mode to valid values for the new source
  const handleSourceChange = useCallback(
    (newSource: InputSource) => {
      setInputSource(newSource);
      if (capabilities) {
        const sourceCaps = capabilities.sourceCapabilities[newSource];
        // Reset resolution to 300 if available, otherwise first option
        if (sourceCaps.resolutions.length > 0) {
          const newRes = sourceCaps.resolutions.includes(300)
            ? 300
            : sourceCaps.resolutions[0];
          setResolution(newRes);
        }
        // Reset color mode to first available
        if (sourceCaps.colorModes.length > 0) {
          setColorMode(sourceCaps.colorModes[0]);
        }
      }
    },
    [capabilities],
  );

  const handleScan = useCallback(async () => {
    if (!selectedScanner) return;

    setIsScanning(true);
    const result = await scanFromDevice(selectedScanner, {
      colorMode,
      resolution,
      format: 'jpeg',
      inputSource,
    });
    setIsScanning(false);

    if (result.success) {
      onScanComplete(result.imageData);
      addToast('Scan completed successfully', 'success');
    } else {
      addToast(result.error, 'error');
    }
  }, [
    selectedScanner,
    colorMode,
    resolution,
    inputSource,
    onScanComplete,
    addToast,
  ]);

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
              'Discover'
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
                  onClick={() => handleSelectScanner(scanner)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    selectedScanner?.id === scanner.id
                      ? 'border-accent bg-accent/5'
                      : 'border-border hover:border-accent/50'
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
                      className={`w-2 h-2 rounded-full ${selectedScanner?.id === scanner.id ? 'bg-accent' : 'bg-muted-light'}`}
                    />
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Scan settings */}
            {selectedScanner && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="pt-4 border-t border-border space-y-3"
              >
                {isLoadingCapabilities ? (
                  <div className="flex items-center justify-center py-4">
                    <Spinner size="sm" className="mr-2" />
                    <span className="text-sm text-muted">
                      Loading capabilities...
                    </span>
                  </div>
                ) : capabilities ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Source selector (ADF/Glass) */}
                      {capabilities.inputSources.length > 1 && (
                        <div className="col-span-2">
                          <label
                            htmlFor="inputSource"
                            className="text-sm text-muted block mb-1"
                          >
                            Scanner Source
                          </label>
                          <select
                            id="inputSource"
                            value={inputSource}
                            onChange={(e) =>
                              handleSourceChange(e.target.value as InputSource)
                            }
                            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm"
                          >
                            {capabilities.inputSources.map((source) => (
                              <option key={source} value={source}>
                                {source === 'Platen'
                                  ? 'Flatbed Glass'
                                  : 'Document Feeder (ADF)'}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {capabilities.inputSources.length === 1 && (
                        <div className="col-span-2 text-sm text-muted">
                          Source:{' '}
                          {capabilities.inputSources[0] === 'Platen'
                            ? 'Flatbed Glass'
                            : 'Document Feeder (ADF)'}
                        </div>
                      )}
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
                          onChange={(e) =>
                            setResolution(Number(e.target.value))
                          }
                          className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm"
                        >
                          {capabilities.sourceCapabilities[
                            inputSource
                          ].resolutions.map((res: number) => (
                            <option key={res} value={res}>
                              {res} DPI
                            </option>
                          ))}
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
                          {capabilities.sourceCapabilities[
                            inputSource
                          ].colorModes.map((mode: ColorMode) => (
                            <option key={mode} value={mode}>
                              {mode === 'color'
                                ? 'Color'
                                : mode === 'grayscale'
                                  ? 'Grayscale'
                                  : 'Black & White'}
                            </option>
                          ))}
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
                        'Scan Document'
                      )}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted text-center py-2">
                    Failed to load scanner capabilities
                  </p>
                )}
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
    vaultSettings: {
      method: settings.vault.method,
      localPath: settings.vault.localPath,
      githubToken: settings.vault.githubToken,
      githubRepo: settings.vault.githubRepo,
    },
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editedEntries, setEditedEntries] = useState<ExtractedEntry[]>([]);
  const { addToast } = useToast();

  // Map scan state to panel state
  const getPanelState = (): ResultsPanelState => {
    switch (scan.state.status) {
      case 'processing':
        return 'processing';
      case 'complete':
        return 'complete';
      case 'error':
        return 'error';
      case 'uploading':
        return 'uploading';
      default:
        return 'idle';
    }
  };

  const handleFileSelect = async (file: File): Promise<void> => {
    // Don't clear entries - allow accumulating from multiple scans
    await scan.upload(file);
    addToast('Image uploaded successfully', 'success');
  };

  const handleProcess = async (): Promise<void> => {
    const scanResult = await scan.process();
    if (scanResult.status === 'complete') {
      const count = scanResult.entries.length;
      if (count > 0) {
        // Append new entries to existing ones (accumulate across multiple scans)
        setEditedEntries((prev) => {
          // Deduplicate by content to avoid adding the same entry twice
          const newEntries = scanResult.entries.filter(
            (newEntry) =>
              !prev.some((existing) => existing.content === newEntry.content),
          );
          return [...prev, ...newEntries];
        });
        addToast(
          `Extracted ${count} new entries - scan more pages or sync to vault`,
          'success',
        );
      } else {
        addToast('No new entries found in scan', 'info');
      }
    } else if (scanResult.status === 'error') {
      addToast(`Failed to process scan: ${scanResult.error}`, 'error');
    }
  };

  const handleUpdateEntry = useCallback(
    (id: string, updates: Partial<ExtractedEntry>) => {
      setEditedEntries((prev) =>
        prev.map((entry) =>
          entry.id === id ? { ...entry, ...updates } : entry,
        ),
      );
    },
    [],
  );

  const handleDeleteEntry = useCallback(
    (id: string) => {
      setEditedEntries((prev) => prev.filter((entry) => entry.id !== id));
      addToast('Entry removed', 'info');
    },
    [addToast],
  );

  const handleSync = async (): Promise<void> => {
    // Check vault configuration based on method
    const { method, localPath, githubConnected, githubToken, githubRepo } =
      settings.vault;

    if (method === 'local') {
      if (!localPath) {
        addToast('Configure vault path in Settings first', 'error');
        return;
      }
    } else if (method === 'github') {
      if (!githubConnected || !githubToken || !githubRepo) {
        addToast(
          'Connect GitHub and select a repository in Settings first',
          'error',
        );
        return;
      }
    }

    if (editedEntries.length === 0) {
      addToast('No entries to sync', 'info');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncEntriesToVault(editedEntries, {
        method,
        localPath,
        githubToken,
        githubRepo,
      });

      if (result.success) {
        addToast('Synced to vault successfully! 🎉', 'success');
        setEditedEntries([]); // Clear after successful sync
        scan.clear();
      } else {
        addToast(`Sync failed: ${result.error}`, 'error');
      }
    } catch (error) {
      addToast(
        `Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error',
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClear = (): void => {
    setEditedEntries([]);
    scan.clear();
  };

  // Handle scan from network device - receives base64 image data
  const handleScanFromDevice = useCallback(
    async (imageData: string): Promise<void> => {
      // Convert base64 to blob and create a File object
      try {
        const response = await fetch(imageData);
        const blob = await response.blob();
        const file = new File([blob], 'scanned-document.jpg', {
          type: blob.type,
        });
        await scan.upload(file);
        addToast(
          "Document scanned successfully! Click 'Process' to extract content.",
          'success',
        );
      } catch (error) {
        addToast(
          `Failed to process scanned image: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'error',
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
                      isProcessing={scan.state.status === 'processing'}
                    />
                  )}
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <NetworkScannersPanel
                onScanComplete={handleScanFromDevice}
                isDisabled={scan.state.status === 'processing'}
              />
            </StaggerItem>
          </StaggerContainer>

          {/* Results Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="h-full"
          >
            <ResultsPanel
              state={getPanelState()}
              entries={editedEntries}
              confidence={
                scan.state.status === 'complete' ? scan.state.confidence : 0
              }
              modelUsed={
                scan.state.status === 'complete'
                  ? scan.state.modelUsed
                  : undefined
              }
              _errorMessage={
                scan.state.status === 'error' ? scan.state.error : undefined
              }
              onUpdateEntry={handleUpdateEntry}
              onDeleteEntry={handleDeleteEntry}
              onSync={handleSync}
              isSyncing={isSyncing}
            />
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};
