import { Button } from '@papersync/ui/button';
import Link from 'next/link';
export const LandingHero = () => (
  <section className="shell grid gap-10 py-16 md:grid-cols-2 md:py-24">
    <div>
      <p className="editorial-eyebrow">Homework, from school to home</p>
      <h1 className="mt-6">
        Paper at school.
        <br />
        <span className="serif-italic ink">A plan at home.</span>
      </h1>
      <p className="mt-6 max-w-prose text-ink-soft text-lg">
        Write down homework while you're in class. When you get home, scan your
        planner, check the assignments and deadlines, and send them to your task
        manager or notes.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <Button asChild={true} size="lg">
          <Link href="/scan">Scan today's homework</Link>
        </Button>
        <Button asChild={true} variant="secondary" size="lg">
          <Link href="/planner">Print a planner</Link>
        </Button>
      </div>
    </div>
    <aside
      className="self-center border border-hairline bg-paper-deep p-8"
      aria-label="Example homework handoff"
    >
      <p className="mono-tag">On your paper</p>
      <p className="serif mt-4 text-2xl">Maths: exercises 4–6, due Thursday</p>
      <div className="my-8 border-hairline border-t" />
      <p className="mono-tag">Ready to plan at home</p>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-ink-soft">
        <dt>Subject</dt>
        <dd>Maths</dd>
        <dt>Homework</dt>
        <dd>Exercises 4–6</dd>
        <dt>Due</dt>
        <dd>Thursday, confirmed by you</dd>
      </dl>
      <p className="mt-6 text-graphite text-sm">
        Review the scan before anything is saved.
      </p>
    </aside>
  </section>
);
