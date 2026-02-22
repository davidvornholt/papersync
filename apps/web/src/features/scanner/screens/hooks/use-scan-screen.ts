'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/shared/components';
import { useSettings } from '@/shared/hooks';
import { syncEntriesToVault } from '@/shared/services/vault-actions';
import { type ExtractedEntry, useScan } from '../../hooks';
import type { ResultsPanelState } from '../scan-screen-types';

type UseScanScreenReturn = {
  readonly scan: ReturnType<typeof useScan>;
  readonly isDragging: boolean;
  readonly setIsDragging: (dragging: boolean) => void;
  readonly isSyncing: boolean;
  readonly editedEntries: readonly ExtractedEntry[];
  readonly panelState: ResultsPanelState;
  readonly handleFileSelect: (file: File) => Promise<void>;
  readonly handleProcess: () => Promise<void>;
  readonly handleUpdateEntry: (
    id: string,
    updates: Partial<ExtractedEntry>,
  ) => void;
  readonly handleDeleteEntry: (id: string) => void;
  readonly handleSync: () => Promise<void>;
  readonly handleClear: () => void;
  readonly handleScanFromDevice: (imageData: string) => Promise<void>;
};

export const useScanScreen = (): UseScanScreenReturn => {
  const { settings } = useSettings();
  const { addToast } = useToast();
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

  const panelState: ResultsPanelState =
    scan.state.status === 'processing' ||
    scan.state.status === 'complete' ||
    scan.state.status === 'error' ||
    scan.state.status === 'uploading'
      ? scan.state.status
      : 'idle';

  const handleFileSelect = async (file: File): Promise<void> => {
    await scan.upload(file);
    addToast('Image uploaded successfully', 'success');
  };

  const handleProcess = async (): Promise<void> => {
    const result = await scan.process();
    if (result.status === 'complete') {
      setEditedEntries((prev) => {
        const newEntries = result.entries.filter(
          (entry) =>
            !prev.some((existing) => existing.content === entry.content),
        );
        return [...prev, ...newEntries];
      });
      addToast(
        result.entries.length > 0
          ? `Extracted ${result.entries.length} new entries`
          : 'No new entries found in scan',
        result.entries.length > 0 ? 'success' : 'info',
      );
      return;
    }

    if (result.status === 'error') {
      addToast(`Failed to process scan: ${result.error}`, 'error');
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
    if (editedEntries.length === 0) {
      addToast('No entries to sync', 'info');
      return;
    }

    const { method, localPath, githubToken, githubRepo } = settings.vault;
    setIsSyncing(true);

    try {
      const result = await syncEntriesToVault(editedEntries, {
        method,
        localPath,
        githubToken,
        githubRepo,
      });

      if (result.success) {
        addToast('Synced to vault successfully!', 'success');
        setEditedEntries([]);
        scan.clear();
      } else {
        addToast(`Sync failed: ${result.error}`, 'error');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClear = (): void => {
    setEditedEntries([]);
    scan.clear();
  };

  const handleScanFromDevice = async (imageData: string): Promise<void> => {
    const response = await fetch(imageData);
    const blob = await response.blob();
    const file = new File([blob], 'scanned-document.jpg', { type: blob.type });
    await scan.upload(file);
    addToast("Document scanned successfully! Click 'Process'.", 'success');
  };

  return {
    scan,
    isDragging,
    setIsDragging,
    isSyncing,
    editedEntries,
    panelState,
    handleFileSelect,
    handleProcess,
    handleUpdateEntry,
    handleDeleteEntry,
    handleSync,
    handleClear,
    handleScanFromDevice,
  };
};
