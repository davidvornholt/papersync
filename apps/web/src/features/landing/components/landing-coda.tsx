import { Button } from '@papersync/ui/button';
import Link from 'next/link';
export const LandingCoda = () => (
  <section className="border-hairline border-t">
    <div className="shell flex flex-wrap items-center justify-between gap-6 py-12">
      <div>
        <h2 className="text-3xl">Set up your first school week.</h2>
        <p className="mt-3 text-ink-soft">
          Choose where homework goes, then add your subjects.
        </p>
      </div>
      <Button asChild={true}>
        <Link href="/settings">Open settings</Link>
      </Button>
    </div>
  </section>
);
