'use client';
import { Effect } from 'effect';
import { useState } from 'react';
import { useToast } from '@/shared/components/use-toast';
import type { ExtractedEntry } from '@/shared/homework/entry';
import { useSettings } from '@/shared/hooks/use-settings';
import { requestAction } from '@/shared/http/action';
import { useScan } from '../../hooks/use-scan';
import { useApplyReviewWeek } from './use-apply-review-week';
import { useScanImagePaste } from './use-scan-image-paste';
import { useScanSave } from './use-scan-save';

export const useScanScreen = () => {
  const { settings, isLoading, loadError } = useSettings();
  const { addToast } = useToast();
  const scan = useScan({
    aiSettings: settings.ai,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [editedEntries, setEditedEntries] = useState<Array<ExtractedEntry>>([]);
  const handleApplyWeek = useApplyReviewWeek(
    scan,
    editedEntries,
    setEditedEntries,
  );
  const handleClear = () => {
    setEditedEntries([]);
    scan.clear();
  };
  const saving = useScanSave({
    scan,
    entries: editedEntries,
    clear: handleClear,
  });
  const handleFailure = (error: { readonly message: string }) =>
    Effect.sync(() => addToast(error.message, 'error'));
  const handleFileSelect = (file: File) => {
    setEditedEntries([]);
    Effect.runFork(
      requestAction(() => scan.upload(file)).pipe(
        Effect.tap((isUploaded) =>
          Effect.sync(() => {
            if (isUploaded) {
              addToast('Image ready to analyze.', 'success');
            }
          }),
        ),
        Effect.catchAll(handleFailure),
      ),
    );
  };
  const isBusy =
    isLoading ||
    loadError !== null ||
    scan.state.status === 'processing' ||
    scan.state.status === 'uploading' ||
    saving.isSyncing ||
    scan.isUpdatingWeek;
  useScanImagePaste({ onFileSelect: handleFileSelect, isDisabled: isBusy });
  const handleProcess = () => {
    setEditedEntries([]);
    Effect.runFork(
      requestAction(scan.process).pipe(
        Effect.tap((result) =>
          Effect.sync(() => {
            if (result.status === 'complete') {
              setEditedEntries([...result.entries]);
              addToast(
                result.entries.length > 0
                  ? `Review ${result.entries.filter((entry) => entry.action !== 'skip').length} new or changed entries`
                  : 'No homework found in this image',
                'info',
              );
            }
            if (result.status === 'error') {
              addToast(result.error, 'error');
            }
          }),
        ),
        Effect.catchAll(handleFailure),
      ),
    );
  };
  const handleScanFromDevice = (imageData: string) => {
    Effect.runFork(
      requestAction(() => fetch(imageData)).pipe(
        Effect.flatMap((response) => requestAction(() => response.blob())),
        Effect.tap((blob) =>
          Effect.sync(() =>
            handleFileSelect(new File([blob], 'scan.jpg', { type: blob.type })),
          ),
        ),
        Effect.catchAll(handleFailure),
      ),
    );
  };
  return {
    scan,
    loadError,
    isBusy,
    isDragging,
    setIsDragging,
    ...saving,
    editedEntries,
    panelState: scan.state.status,
    handleFileSelect,
    handleApplyWeek,
    handleProcess,
    handleClear,
    handleScanFromDevice,
    handleUpdateEntry: (id: string, updates: Partial<ExtractedEntry>) =>
      setEditedEntries((entries) =>
        entries.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                ...updates,
                action: entry.action === 'skip' ? 'modify' : entry.action,
              }
            : entry,
        ),
      ),
    handleDeleteEntry: (id: string) =>
      setEditedEntries((entries) => entries.filter((entry) => entry.id !== id)),
  };
};
