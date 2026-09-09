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
  <header className="border-hairline border-b pt-5 pb-6 sm:pt-8 sm:pb-10 md:pt-10 md:pb-12">
    <div className="grid grid-cols-1 gap-y-6 md:grid-cols-12 md:items-end md:gap-x-16">
      <div className="md:col-span-8">
        <p className="editorial-eyebrow animate-rise">{`${index} — ${section}`}</p>

        <h1 className="mt-4 animate-rise text-[34px] leading-[1] delay-100 sm:mt-6 sm:text-[48px] md:text-[64px] md:leading-[0.98]">
          {title}
          {italicSuffix ? (
            <>
              <br />
              <span className="serif-italic ink">{italicSuffix}</span>
            </>
          ) : null}
        </h1>

        {description ? (
          <p className="measure mt-4 animate-rise text-[15px] text-ink-soft delay-200 sm:mt-5 sm:text-[16.5px]">
            {description}
          </p>
        ) : null}
      </div>

      {aside ? (
        <aside className="animate-rise border-hairline border-t pt-4 delay-300 md:col-span-4 md:border-t-0 md:border-l md:pt-0 md:pl-10">
          {aside}
        </aside>
      ) : null}
    </div>
  </header>
);
