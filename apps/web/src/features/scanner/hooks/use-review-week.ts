'use client';

import { Effect } from 'effect';
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useState,
} from 'react';
import { applyReviewWeek } from '@/shared/homework/actions';
import type { ExtractedEntry } from '@/shared/homework/entry';
import { requestAction } from '@/shared/http/action';
import type { WeekId } from '@/shared/types/schemas';
import type { ScanNotify, ScanState } from './use-scan-types';

type ReviewWeekOptions = {
  readonly state: ScanState;
  readonly setState: Dispatch<SetStateAction<ScanState>>;
  readonly weekId: WeekId | null;
  readonly entries: ReadonlyArray<ExtractedEntry>;
  readonly setEntries: Dispatch<SetStateAction<ReadonlyArray<ExtractedEntry>>>;
  readonly revisionRef: RefObject<number>;
  readonly notify: ScanNotify;
};

export const useReviewWeek = ({
  state,
  setState,
  weekId,
  entries,
  setEntries,
  revisionRef,
  notify,
}: ReviewWeekOptions) => {
  const [isUpdatingWeek, setIsUpdatingWeek] = useState(false);
  const applyWeek = () => {
    if (state.status !== 'complete' || !weekId || isUpdatingWeek) {
      return;
    }
    revisionRef.current += 1;
    const currentRevision = revisionRef.current;
    setIsUpdatingWeek(true);
    Effect.runFork(
      requestAction(() => applyReviewWeek(entries, weekId)).pipe(
        Effect.catch((error) =>
          Effect.succeed({ success: false as const, error: error.message }),
        ),
        Effect.tap((result) =>
          Effect.sync(() => {
            if (currentRevision !== revisionRef.current) {
              return;
            }
            if (result.success) {
              setState({ ...state, weekId });
              setEntries(result.entries);
              notify(
                'Week applied. Your edits are preserved; check due dates against the paper before saving.',
                'info',
              );
            } else {
              notify(result.error, 'error');
            }
          }),
        ),
        Effect.ensuring(
          Effect.sync(() => {
            if (currentRevision === revisionRef.current) {
              setIsUpdatingWeek(false);
            }
          }),
        ),
      ),
    );
  };
  return { isUpdatingWeek, setIsUpdatingWeek, applyWeek };
};
