import type { ComponentProps } from 'react';

export const Checkbox = ({
  className = '',
  ...props
}: Omit<ComponentProps<'input'>, 'type'>) => (
  <input
    {...props}
    type="checkbox"
    className={`paper-checkbox inline-grid size-6 shrink-0 cursor-pointer appearance-none place-content-center rounded-none border border-graphite bg-paper text-paper checked:border-accent checked:bg-accent focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-3 disabled:cursor-not-allowed disabled:opacity-50 forced-colors:appearance-auto ${className}`}
  />
);
