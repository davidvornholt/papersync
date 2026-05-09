'use client';

import { motion } from 'motion/react';

type Feature = {
  readonly category: string;
  readonly title: string;
  readonly body: string;
};

const FEATURES: readonly Feature[] = [
  {
    category: 'Recognition',
    title: 'Vision OCR for human handwriting.',
    body: 'PaperSync hands the scan to your chosen vision model, parses the structured response, and returns editable entries with a confidence score you can see and override.',
  },
  {
    category: 'Composition',
    title: 'A printable PDF planner per week.',
    body: 'Typeset on the fly with subjects, slots, and per-day exceptions. Printed at A4. Designed for ink, not for screens.',
  },
  {
    category: 'Anchoring',
    title: 'QR codes that remember the week.',
    body: 'Each printed page is silently tagged with a week and day identifier so the scanner always knows where extracted entries belong, even when stacks are out of order.',
  },
  {
    category: 'Vault',
    title: 'Obsidian, on disk or on GitHub.',
    body: 'Sync directly to a local Obsidian folder, or to a private GitHub repository. The format follows the conventions your other notes already use.',
  },
  {
    category: 'Schedule',
    title: 'A timetable with grace for exceptions.',
    body: 'Define the recurring weekly schedule once. Bend it for holidays, swaps, and assemblies on a per-day basis without rewriting the rule.',
  },
  {
    category: 'Network',
    title: 'Talks to scanners on your LAN.',
    body: 'Discovers compatible network scanners over mDNS and pulls images straight into the workflow — no USB cable, no driver dance.',
  },
];

const easeOut = [0.2, 0.6, 0.2, 1] as const;

export const LandingFeatures = (): React.ReactElement => (
  <section className="border-t border-hairline">
    <div className="shell py-20 sm:py-24 md:py-32">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-y-6 md:gap-y-12 md:gap-x-16 md:items-end">
        <div className="md:col-span-6">
          <p className="section-number">04 — In the Toolbox</p>
          <h2 className="mt-5 sm:mt-6 max-w-[16ch]">
            Six small tools,
            <span className="serif-italic"> sharply chosen.</span>
          </h2>
        </div>
        <p className="md:col-span-6 measure text-ink-soft">
          PaperSync resists the temptation to do everything. What it ships, it
          ships precisely — and nothing else.
        </p>
      </div>

      <ul className="mt-14 sm:mt-20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-px bg-hairline border border-hairline">
        {FEATURES.map((feature, index) => (
          <motion.li
            key={feature.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{
              duration: 0.6,
              delay: (index % 3) * 0.06,
              ease: easeOut,
            }}
            className="bg-paper p-6 sm:p-8 md:p-10 flex flex-col"
          >
            <p className="mono text-[10px] uppercase tracking-[0.22em] text-graphite">
              {feature.category}
            </p>
            <h3 className="mt-5 sm:mt-6 text-[20px] sm:text-[22px] md:text-[24px] leading-[1.18] tracking-[-0.022em] text-ink">
              {feature.title}
            </h3>
            <p className="mt-3 sm:mt-4 text-[14.5px] text-ink-soft leading-[1.6]">
              {feature.body}
            </p>
          </motion.li>
        ))}
      </ul>
    </div>
  </section>
);
