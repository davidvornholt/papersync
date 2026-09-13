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
import type { ReviewWeekResult } from '@/shared/homework/review-week';
import { requestAction } from '@/shared/http/action';
import type { WeekId } from '@/shared/types/schemas';
import type { ScanState } from './use-scan-types';

type ReviewWeekOptions = {
  readonly state: ScanState;
  readonly setState: Dispatch<SetStateAction<ScanState>>;
  readonly weekId: WeekId | null;
  readonly revisionRef: RefObject<number>;
};

export const useReviewWeek = ({
  state,
  setState,
  weekId,
  revisionRef,
}: ReviewWeekOptions) => {
  const [isUpdatingWeek, setIsUpdatingWeek] = useState(false);
  const applyWeek = (
    entries: ReadonlyArray<ExtractedEntry>,
  ): Promise<ReviewWeekResult | null> => {
    if (state.status !== 'complete' || !weekId || isUpdatingWeek) {
      return Promise.resolve(null);
    }
    revisionRef.current += 1;
    const currentRevision = revisionRef.current;
    setIsUpdatingWeek(true);
    return Effect.runPromise(
      requestAction(() => applyReviewWeek(entries, weekId)).pipe(
        Effect.catchAll((error) =>
          Effect.succeed({ success: false as const, error: error.message }),
        ),
        Effect.map((result) => {
          if (currentRevision !== revisionRef.current) {
            return null;
          }
          if (result.success) {
            setState({ ...state, weekId, entries: result.entries });
          }
          return result;
        }),
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
