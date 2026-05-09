import type { ReactElement, ReactNode } from 'react';

export type EditorialHeaderProps = {
  readonly index: string;
  readonly section: string;
  readonly title: string;
  readonly italicSuffix?: string;
  readonly description?: string;
  readonly aside?: ReactNode;
};

export const EditorialHeader = ({
  index,
  section,
  title,
  italicSuffix,
  description,
  aside,
}: EditorialHeaderProps): ReactElement => (
  <header className="pt-5 sm:pt-8 md:pt-10 pb-6 sm:pb-10 md:pb-12 border-b border-hairline">
    <div className="grid grid-cols-1 md:grid-cols-12 gap-y-6 md:gap-x-16 md:items-end">
      <div className="md:col-span-8">
        <p className="editorial-eyebrow animate-rise">{`${index} — ${section}`}</p>

        <h1 className="mt-4 sm:mt-6 text-[34px] sm:text-[48px] md:text-[64px] leading-[1] md:leading-[0.98] animate-rise delay-100">
          {title}
          {italicSuffix ? (
            <>
              <br />
              <span className="serif-italic ink">{italicSuffix}</span>
            </>
          ) : null}
        </h1>

        {description ? (
          <p className="mt-4 sm:mt-5 measure text-ink-soft text-[15px] sm:text-[16.5px] animate-rise delay-200">
            {description}
          </p>
        ) : null}
      </div>

      {aside ? (
        <aside className="md:col-span-4 pt-4 md:pt-0 md:pl-10 border-t md:border-t-0 md:border-l border-hairline animate-rise delay-300">
          {aside}
        </aside>
      ) : null}
    </div>
  </header>
);
