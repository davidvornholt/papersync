'use client';

import { Effect, Schema } from 'effect';
import { useRef, useState } from 'react';
import type { ExtractedEntry } from '@/shared/homework/entry';
import { WeekId } from '@/shared/types/schemas';
import { scanPageLimit } from '../services/scan-limits';
import { cancelScanJob } from './scan-job-client';
import { useReviewWeek } from './use-review-week';
import { type ScanDraft, useScanDraft } from './use-scan-draft';
import { useScanJob } from './use-scan-job';
import { useScanPages } from './use-scan-pages';
import type {
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

export const useScan = ({
  aiSettings,
  notify,
}: UseScanOptions): UseScanReturn => {
  const [state, setState] = useState<ScanState>({ status: 'idle' });
  const [weekId, setWeek] = useState<WeekId | null>(null);
  const [entries, setEntries] = useState<ReadonlyArray<ExtractedEntry>>([]);
  const revisionRef = useRef(0);
  const pageList = useScanPages({ notify, setState });
  const job = useScanJob({ setState, setWeek, setEntries, notify });
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
      if (stored.result) {
        setState({ status: 'complete', ...stored.result });
      } else if (stored.jobId) {
        setState({ status: 'processing', jobId: stored.jobId });
        job.follow(stored.jobId);
      }
    },
  });

  const analyze = () => {
    const isBusy =
      state.status === 'processing' || pageList.isPreparing || isRestoring;
    if (pageList.pages.length === 0 || isBusy) {
      return;
    }
    revisionRef.current += 1;
    setEntries([]);
    setState({ status: 'processing', jobId: null });
    job.start(
      pageList.pages.map((page) => page.image),
      weekId,
      aiSettings,
    );
  };

  const cancel = () => {
    job.stop();
    if (state.status === 'processing') {
      if (state.jobId) {
        Effect.runFork(cancelScanJob(state.jobId));
      }
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
    canSave:
      state.status === 'complete' &&
      weekId !== null &&
      state.weekId === weekId &&
      !review.isUpdatingWeek,
    applyWeek: review.applyWeek,
    analyze,
    cancel,
    clear: () => {
      cancel();
      revisionRef.current += 1;
      pageList.setPages([]);
      setState({ status: 'idle' });
      review.setIsUpdatingWeek(false);
      setWeek(null);
      setEntries([]);
    },
  };
};
