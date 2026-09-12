import type { ComponentProps } from 'react';

export const Select = ({
  className = '',
  ...props
}: ComponentProps<'select'>) => (
  <select
    {...props}
    className={`paper-select min-h-11 cursor-pointer appearance-none rounded-none border border-graphite bg-paper py-2.5 pr-10 pl-3 text-ink focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-3 disabled:cursor-not-allowed disabled:opacity-50 forced-colors:appearance-auto ${className}`}
  />
);
