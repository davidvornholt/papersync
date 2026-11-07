'use client';

import { Schema } from 'effect';
import { useRef, useState } from 'react';
import type { ExtractedEntry } from '@/shared/homework/entry';
import { WeekId } from '@/shared/types/schemas';
import { scanPageLimit } from '../services/scan-limits';
import type { StoredReview } from './scan-draft-store';
import { stopScanAnalysis, useClearScan } from './use-clear-scan';
import { useReviewWeek } from './use-review-week';
import { type ScanDraft, useScanDraft } from './use-scan-draft';
import { useScanJob } from './use-scan-job';
import { useScanPages } from './use-scan-pages';
import type {
  ScanPage,
  ScanState,
  UseScanOptions,
  UseScanReturn,
} from './use-scan-types';

const markReviewed = (
  entries: ReadonlyArray<ExtractedEntry>,
  id: string,
  updates: Partial<ExtractedEntry>,
) =>
  entries.map((entry) =>
    entry.id === id
      ? {
          ...entry,
          ...updates,
          action: entry.action === 'skip' ? 'modify' : entry.action,
        }
      : entry,
  );

// Saving waits while the week is being applied, and while a photo is still
// being prepared: it joins the scan after the analysis was shown.
const canSaveReview = (
  state: ScanState,
  weekId: WeekId | null,
  isChanging: boolean,
): boolean =>
  state.status === 'complete' &&
  !state.hasNewPages &&
  weekId !== null &&
  state.weekId === weekId &&
  !isChanging;

const withoutPages =
  (saved: ReadonlyArray<ScanPage>) =>
  (current: ReadonlyArray<ScanPage>): ReadonlyArray<ScanPage> =>
    current.filter((page) => !saved.includes(page));

const restoredState = (stored: StoredReview): ScanState | null => {
  const hasNewPages = stored.hasNewPages ?? false;
  if (stored.result) {
    return { status: 'complete', ...stored.result, hasNewPages };
  }
  return stored.jobId
    ? { status: 'processing', jobId: stored.jobId, hasNewPages }
    : null;
};

export const useScan = ({
  aiSettings,
  notify,
}: UseScanOptions): UseScanReturn => {
  const [state, setState] = useState<ScanState>({ status: 'idle' });
  const [weekId, setWeek] = useState<WeekId | null>(null);
  const [entries, setEntries] = useState<ReadonlyArray<ExtractedEntry>>([]);
  const revisionRef = useRef(0);
  const pageList = useScanPages({ notify, setState });
  const job = useScanJob({ state, setState, setWeek, setEntries, notify });
  const review = useReviewWeek({
    state,
    setState,
    weekId,
    entries,
    setEntries,
    revisionRef,
    notify,
  });
  const isRestoring = useScanDraft({
    pages: pageList.pages,
    state,
    weekId,
    entries,
    restore: ({ pages, review: stored }: ScanDraft) => {
      pageList.setPages(pages);
      setWeek(stored.weekId);
      setEntries(stored.entries);
      setState((current) => restoredState(stored) ?? current);
    },
    receiveShared: (photos) => {
      pageList.addPages(photos);
      notify(
        photos.length === 1
          ? 'Added the shared photo.'
          : `Added ${photos.length} shared photos.`,
        'success',
      );
    },
  });

  const clearing = useClearScan({
    state,
    stop: job.stop,
    notify,
    reset: (saved) => {
      revisionRef.current += 1;
      pageList.setPages(saved ? withoutPages(saved) : []);
      setState({ status: 'idle' });
      review.setIsUpdatingWeek(false);
      setWeek(null);
      setEntries([]);
    },
  });

  const analyze = () => {
    const isBusy =
      state.status === 'processing' ||
      pageList.isPreparing ||
      isRestoring ||
      clearing.isClearing;
    if (pageList.pages.length === 0 || isBusy) {
      return;
    }
    revisionRef.current += 1;
    setEntries([]);
    setState({ status: 'processing', jobId: null, hasNewPages: false });
    job.start(
      pageList.pages.map((page) => page.image),
      weekId,
      aiSettings,
    );
  };

  const cancel = () => {
    stopScanAnalysis(state, job.stop);
    if (state.status === 'processing') {
      setState({ status: 'idle' });
    }
  };

  return {
    state,
    isRestoring,
    isPreparing: pageList.isPreparing,
    pages: pageList.pages,
    pageLimit: scanPageLimit,
    addPages: pageList.addPages,
    removePage: pageList.removePage,
    weekId,
    setWeekId: (value) => {
      revisionRef.current += 1;
      setWeek(Schema.is(WeekId)(value) ? value : null);
      setState((current) =>
        current.status === 'complete' || current.status === 'processing'
          ? current
          : { status: 'idle' },
      );
    },
    entries,
    updateEntry: (id, updates) =>
      setEntries((current) => markReviewed(current, id, updates)),
    deleteEntry: (id) =>
      setEntries((current) => current.filter((entry) => entry.id !== id)),
    isUpdatingWeek: review.isUpdatingWeek,
    canSave: canSaveReview(
      state,
      weekId,
      review.isUpdatingWeek || pageList.isPreparing,
    ),
    applyWeek: review.applyWeek,
    analyze,
    cancel,
    ...clearing,
  };
};
