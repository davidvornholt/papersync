'use client';

import { motion } from 'motion/react';

type Principle = {
  readonly number: string;
  readonly heading: string;
  readonly italic: string;
  readonly body: string;
};

const PRINCIPLES: readonly Principle[] = [
  {
    number: '01',
    heading: 'Free and open source.',
    italic: 'No PaperSync subscription. No hosted account requirement.',
    body: 'PaperSync is a self-hosted tool you run yourself. There is no PaperSync monthly subscription, SaaS plan, or vendor-hosted account standing between you and your workflow.',
  },
  {
    number: '02',
    heading: 'Open source.',
    italic: 'Read the code. Patch it. Make it your own.',
    body: 'The full source is published under the MIT license. You can audit how your handwriting is read, change how the planner is composed, and fork the project entirely. There is no hidden engine or proprietary core.',
  },
  {
    number: '03',
    heading: 'Self-hosted.',
    italic: 'Your data sleeps where you sleep.',
    body: 'Run PaperSync on your laptop, on a Raspberry Pi at the edge of your desk, or on a small box in a closet you trust. Your scans, your vault, your keys, your network. Nothing leaves your hardware unless you explicitly tell it to.',
  },
  {
    number: '04',
    heading: 'Bring your own keys.',
    italic: 'No SaaS. No vendor account. No middleman.',
    body: 'PaperSync never asks you to sign up for a PaperSync account, because there are none to sign up for. You point it at your own Google AI key, your own local Ollama endpoint, your own GitHub. The cost of running it is exactly the cost of the providers you choose.',
  },
];

const easeOut = [0.2, 0.6, 0.2, 1] as const;

export const LandingPrinciples = (): React.ReactElement => (
  <section className="border-t border-hairline">
    <div className="shell py-20 sm:py-24 md:py-32">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-y-10 md:gap-y-12 md:gap-x-16">
        <div className="md:col-span-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: easeOut }}
            className="md:sticky md:top-32"
          >
            <p className="section-number">02 — The Contract</p>
            <h2 className="mt-5 sm:mt-6 max-w-[14ch]">
              Four promises,
              <span className="serif-italic"> in writing.</span>
            </h2>
            <p className="mt-5 sm:mt-6 measure text-ink-soft">
              Software always tells you what it does. PaperSync also tells you
              what it will never do — so you can keep tending your notes for a
              decade without flinching.
            </p>
          </motion.div>
        </div>

        <ol className="md:col-span-8 space-y-px">
          {PRINCIPLES.map((principle, index) => (
            <motion.li
              key={principle.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{
                duration: 0.7,
                delay: index * 0.06,
                ease: easeOut,
              }}
              className="group grid grid-cols-[44px_1fr] sm:grid-cols-[64px_1fr] gap-4 sm:gap-6 py-8 sm:py-10 border-t border-hairline first:border-t-0"
            >
              <span className="mono text-[11px] sm:text-[12px] tracking-[0.18em] text-graphite pt-2">
                {principle.number}
              </span>
              <div>
                <h3 className="text-[24px] sm:text-[26px] md:text-[30px] leading-[1.1] tracking-[-0.025em]">
                  {principle.heading}
                </h3>
                <p className="serif-italic mt-3 text-[16px] sm:text-[18px] text-ink-soft">
                  {principle.italic}
                </p>
                <p className="mt-4 sm:mt-5 measure-wide text-ink-soft">
                  {principle.body}
                </p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  </section>
);
