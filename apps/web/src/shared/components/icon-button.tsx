'use client';

import { type ButtonHTMLAttributes, useEffect, useId, useState } from 'react';

type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'title'
> & {
  readonly label: string;
};

export const IconButton = ({
  label,
  children,
  className = '',
  ...props
}: IconButtonProps): React.ReactElement => {
  const tooltipId = useId();
  const [isDismissed, setIsDismissed] = useState(false);
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDismissed(true);
      }
    };
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, []);
  return (
    <span className="group relative inline-flex shrink-0">
      <button
        {...props}
        type={props.type ?? 'button'}
        aria-label={label}
        aria-describedby={tooltipId}
        className={`inline-flex size-11 cursor-pointer touch-manipulation items-center justify-center text-graphite transition-colors hover:bg-paper-deep hover:text-accent focus-visible:text-accent disabled:pointer-events-none disabled:opacity-40 ${className}`}
        onFocus={(event) => {
          setIsDismissed(false);
          props.onFocus?.(event);
        }}
        onPointerEnter={(event) => {
          setIsDismissed(false);
          props.onPointerEnter?.(event);
        }}
      >
        {children}
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={`absolute right-0 bottom-full z-20 w-max max-w-56 pb-1 ${isDismissed ? 'hidden' : 'invisible group-focus-within:visible group-hover:visible'}`}
      >
        <span className="block bg-ink px-3 py-2 text-paper text-xs">
          {label}
        </span>
      </span>
    </span>
  );
};
