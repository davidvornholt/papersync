import { databaseRuntime } from '@papersync/db/runtime';
import { Effect } from 'effect';
import { analyzeScan } from '@/features/scanner/services/scan-analysis';
import { startScanJob } from '@/features/scanner/services/scan-jobs';
import { parseScanRequest } from '@/features/scanner/services/scan-request';
import { rejectUnauthorizedApiRequest } from '@/shared/auth/session';

const acceptedStatus = 202;

export const POST = async (request: Request): Promise<Response> => {
  const rejection = await rejectUnauthorizedApiRequest(request);
  if (rejection) {
    return rejection;
  }
  return databaseRuntime.runPromise(
    parseScanRequest(request).pipe(
      Effect.flatMap((input) => startScanJob(analyzeScan(input))),
      Effect.match({
        onFailure: (error) =>
          Response.json({ error: error.message }, { status: error.status }),
        onSuccess: (id) => Response.json({ id }, { status: acceptedStatus }),
      }),
    ),
  );
};
