'use client';

import { Button } from '@papersync/ui/button';
import { motion } from 'motion/react';
import Link from 'next/link';

const easeOut = [0.2, 0.6, 0.2, 1] as const;

export const LandingCoda = (): React.ReactElement => (
  <section className="border-t border-hairline bg-paper-deep/50">
    <div className="shell py-20 sm:py-28 md:py-40">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-y-10 md:gap-y-12 md:gap-x-16 md:items-end">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: easeOut }}
          className="md:col-span-7"
        >
          <p className="section-number">05 — Begin</p>
          <h2 className="mt-5 sm:mt-6 text-[36px] sm:text-[48px] md:text-[72px] lg:text-[80px] leading-[1] md:leading-[0.98]">
            Print Sunday.
            <br />
            <span className="serif-italic ink">Read Friday.</span>
          </h2>
          <p className="mt-6 sm:mt-8 measure-wide text-[16px] sm:text-[18px] text-ink-soft">
            The first cycle takes ten quiet minutes to set up. The next fifty
            cycles take none. There is nothing to subscribe to, nothing to
            install in the cloud, and nothing standing between your hand and
            your second brain.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, delay: 0.15, ease: easeOut }}
          className="md:col-span-5 flex flex-col gap-3"
        >
          <Button asChild variant="secondary" size="lg" className="w-full">
            <Link href="/settings">
              <span>Configure your vault first</span>
            </Link>
          </Button>
          <Button asChild size="lg" className="w-full">
            <Link href="/planner">
              <span>Generate this week</span>
              <span className="btn-arrow" aria-hidden>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <title>Arrow</title>
                  <path
                    d="M2 7h10M8 3l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Link>
          </Button>
        </motion.div>
      </div>

      <div className="mt-16 sm:mt-24 md:mt-36 pt-6 sm:pt-8 border-t border-hairline grid grid-cols-1 md:grid-cols-3 gap-y-6 md:gap-x-16">
        {COLOPHON.map((entry) => (
          <div key={entry.label}>
            <p className="mono text-[10px] uppercase tracking-[0.22em] text-graphite">
              {entry.label}
            </p>
            <p className="mt-2 text-[14.5px] text-ink-soft">
              {entry.body}{' '}
              {entry.italic ? (
                <span className="serif-italic text-ink">{entry.italic}</span>
              ) : null}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const COLOPHON = [
  {
    label: 'Cost',
    body: 'PaperSync is free and open source.',
    italic: 'You only pay your chosen providers.',
  },
  {
    label: 'License',
    body: 'MIT — read it, fork it, host it.',
    italic: '',
  },
  {
    label: 'Set in',
    body: 'Fraunces, DM Sans, JetBrains Mono.',
    italic: 'On warm cream stock.',
  },
] as const;
