// biome-ignore lint/correctness/noUnresolvedImports: Biome cannot resolve this conditional CommonJS export; TypeScript and the production build verify it.
import { Suspense } from 'react';
import { PlannerScreen } from '@/features/planner/screens/planner-screen';

const PlannerPage = (): React.ReactElement => (
  <Suspense fallback={<p role="status">Opening planner…</p>}>
    <PlannerScreen />
  </Suspense>
);

export default PlannerPage;
