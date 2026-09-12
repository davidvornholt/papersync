'use client';
import { Effect } from 'effect';
import { useState } from 'react';
import type { ExtractedEntry } from '@/features/scanner/hooks/use-scan-types';
import { useToast } from '@/shared/components/use-toast';
import { useSettings } from '@/shared/hooks/use-settings';
import { requestAction } from '@/shared/http/action';
import { useScan } from '../../hooks/use-scan';
import { useScanImagePaste } from './use-scan-image-paste';
import { useScanSave } from './use-scan-save';

export const useScanScreen = () => {
  const { settings, isLoading } = useSettings();
  const { addToast } = useToast();
  const scan = useScan({
    aiSettings: settings.ai,
    vaultSettings:
      settings.vault.method === 'super-productivity'
        ? undefined
        : { ...settings.vault, method: settings.vault.method },
  });
  const [isDragging, setIsDragging] = useState(false);
  const [editedEntries, setEditedEntries] = useState<Array<ExtractedEntry>>([]);
  const handleClear = () => {
    setEditedEntries([]);
    scan.clear();
  };
  const saving = useScanSave({
    scan,
    entries: editedEntries,
    vault: { ...settings.vault, method: settings.vault.method },
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
              addToast('Image ready. Check the printed week.', 'success');
            }
          }),
        ),
        Effect.catchAll(handleFailure),
      ),
    );
  };
  const isBusy =
    isLoading ||
    scan.state.status === 'processing' ||
    scan.state.status === 'uploading' ||
    saving.isSyncing;
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
                  ? `Review ${result.entries.length} extracted entries`
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
    isBusy,
    isDragging,
    setIsDragging,
    ...saving,
    editedEntries,
    panelState: scan.state.status,
    handleFileSelect,
    handleProcess,
    handleClear,
    handleScanFromDevice,
    handleUpdateEntry: (id: string, updates: Partial<ExtractedEntry>) =>
      setEditedEntries((entries) =>
        entries.map((entry) =>
          entry.id === id ? { ...entry, ...updates } : entry,
        ),
      ),
    handleDeleteEntry: (id: string) =>
      setEditedEntries((entries) => entries.filter((entry) => entry.id !== id)),
  };
};
