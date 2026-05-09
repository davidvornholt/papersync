'use client';

import { Button } from '@papersync/ui/button';
import { motion } from 'motion/react';
import Link from 'next/link';

const easeOut = [0.2, 0.6, 0.2, 1] as const;

export const LandingHero = (): React.ReactElement => (
  <section className="relative pt-12 sm:pt-20 md:pt-28 pb-20 sm:pb-24 md:pb-36 overflow-hidden">
    <div className="shell">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: easeOut }}
        className="editorial-eyebrow"
      >
        PaperSync — a quiet bridge
      </motion.div>

      <h1 className="mt-8 sm:mt-10 md:mt-14 max-w-[18ch]">
        <motion.span
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: easeOut }}
          className="block"
        >
          Paper, made
        </motion.span>
        <motion.span
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25, ease: easeOut }}
          className="serif-italic ink block"
        >
          legible
        </motion.span>
        <motion.span
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: easeOut }}
          className="block"
        >
          to your second brain.
        </motion.span>
      </h1>

      <div className="mt-10 sm:mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-12 gap-y-10 sm:gap-y-12 md:gap-x-16 md:items-end">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: easeOut }}
          className="md:col-span-7 measure-wide"
        >
          <p className="text-[16px] sm:text-[18px] md:text-[20px] leading-[1.55] text-ink-soft">
            Print a planner on Sunday. Fill it by hand all week. Scan on Friday
            and watch the ink translate itself into structured notes inside the
            very same local vault you have been tending for years.
            <span className="serif-italic">
              {' '}
              No subscription. No cloud lock-in. Just paper, ink and code you
              can read.
            </span>
          </p>

          <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Button asChild size="lg">
              <Link href="/scan" aria-label="Open the scan workflow">
                <span>Begin scanning</span>
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
            <Link
              href="https://github.com/davidvornholt/papersync"
              className="editorial-link mono text-[12px] uppercase tracking-[0.18em] text-graphite hover:text-ink"
              aria-label="Read the source on GitHub"
            >
              Read the source
            </Link>
          </div>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.7, ease: easeOut }}
          className="md:col-span-5 md:pl-10 md:border-l md:border-hairline"
        >
          <div className="space-y-6">
            <p className="mono-tag">In this issue</p>
            <ol className="space-y-4">
              {ISSUE.map((entry) => (
                <li
                  key={entry.title}
                  className="grid grid-cols-[36px_1fr_auto] items-baseline gap-3"
                >
                  <span className="mono text-[12px] text-graphite">
                    {entry.number}
                  </span>
                  <span className="serif text-[18px] text-ink leading-tight">
                    {entry.title}
                  </span>
                  <span className="mono text-[11px] text-mute">
                    p. {entry.page}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </motion.aside>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1, ease: easeOut }}
        className="mt-16 sm:mt-24 md:mt-36 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-5 sm:pt-6 border-t border-hairline"
      >
        <span className="mono text-[11px] uppercase tracking-[0.18em] text-graphite">
          v0.1 — self-hosted, BYOK, MIT
        </span>
        <span className="serif-italic text-[14px] sm:text-[15px] text-ink-soft">
          Released openly, week 19, 2026.
        </span>
      </motion.div>
    </div>
  </section>
);

const ISSUE = [
  { number: '01', title: 'A free, honest contract.', page: '02' },
  { number: '02', title: 'The four-step weekly cadence.', page: '03' },
  { number: '03', title: 'What lives in the toolbox.', page: '04' },
  { number: '04', title: 'Begin your first week.', page: '05' },
] as const;
