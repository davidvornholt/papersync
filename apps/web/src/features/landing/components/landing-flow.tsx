'use client';

import { motion } from 'motion/react';

type Step = {
  readonly index: string;
  readonly verb: string;
  readonly heading: string;
  readonly body: string;
  readonly meta: string;
};

const STEPS: readonly Step[] = [
  {
    index: '01',
    verb: 'Print',
    heading: 'A weekly planner, composed for ink.',
    body: 'PaperSync renders a calm, typographically considered PDF for the week. Each day carries the right subjects from your timetable and a small QR code that quietly remembers which week and which day this page belongs to.',
    meta: 'PDF · A4 · QR-anchored',
  },
  {
    index: '02',
    verb: 'Write',
    heading: 'Live the week on paper.',
    body: 'Take it with you. Write in pen, in pencil, in margin notes. Cross things out. Doodle in the gutters. Paper does not nag, sync, or autocorrect — it just listens.',
    meta: 'Anywhere · Anything · Yours',
  },
  {
    index: '03',
    verb: 'Scan',
    heading: 'A vision model reads your hand.',
    body: 'On Friday, scan the page or photograph it. PaperSync sends the image to the AI provider you chose — Google or a local Ollama model — and turns your handwriting into structured entries you can review, edit, and trust.',
    meta: 'Google AI · Ollama · BYOK',
  },
  {
    index: '04',
    verb: 'Sync',
    heading: 'Into the vault you already trust.',
    body: 'Approved entries flow into your Obsidian vault — either on your local filesystem or through a GitHub repository — folded into the right weekly note, ready to live alongside the rest of your second brain.',
    meta: 'Local · GitHub · Obsidian-shaped',
  },
];

const easeOut = [0.2, 0.6, 0.2, 1] as const;

export const LandingFlow = (): React.ReactElement => (
  <section className="border-t border-hairline bg-paper-deep/30">
    <div className="shell py-20 sm:py-24 md:py-36">
      <div className="max-w-[40rem]">
        <p className="section-number">03 — The Cadence</p>
        <h2 className="mt-5 sm:mt-6">
          A small ritual,
          <br />
          <span className="serif-italic">repeated weekly.</span>
        </h2>
        <p className="mt-5 sm:mt-6 measure text-ink-soft">
          Four moments. Sunday to Friday. Designed to disappear once you know
          the rhythm — leaving only the writing, and the second brain that
          remembers it for you.
        </p>
      </div>

      <ol className="mt-14 sm:mt-20 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12 sm:gap-y-16">
        {STEPS.map((step, index) => (
          <motion.li
            key={step.index}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{
              duration: 0.7,
              delay: (index % 2) * 0.08,
              ease: easeOut,
            }}
            className="relative"
          >
            <div className="flex items-baseline gap-3 sm:gap-4">
              <span className="serif text-[64px] sm:text-[88px] md:text-[112px] leading-none -tracking-[0.04em] font-light">
                <span className="text-ink/15">{step.index}</span>
              </span>
              <span className="serif-italic ink text-[20px] sm:text-[24px] md:text-[28px]">
                {step.verb.toLowerCase()}.
              </span>
            </div>

            <h3 className="mt-5 sm:mt-6 text-[22px] sm:text-[24px] md:text-[26px] leading-[1.15] tracking-[-0.025em] max-w-[22ch]">
              {step.heading}
            </h3>

            <p className="mt-3 sm:mt-4 measure text-ink-soft">{step.body}</p>

            <p className="mt-5 sm:mt-6 mono text-[11px] uppercase tracking-[0.18em] text-graphite">
              {step.meta}
            </p>
          </motion.li>
        ))}
      </ol>
    </div>
  </section>
);
