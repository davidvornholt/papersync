import type { HTMLAttributes, ReactElement, ReactNode } from 'react';

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  readonly children: ReactNode;
  /** Compatibility-only: editorial cards stay flat even when requested elevated. */
  readonly elevated?: boolean;
};

export const Card = ({
  children,
  className = '',
  elevated: _elevated,
  ...props
}: CardProps): ReactElement => (
  <div className={`paper-card ${className}`.trim()} {...props}>
    {children}
  </div>
);

export type CardSectionProps = HTMLAttributes<HTMLDivElement> & {
  readonly children: ReactNode;
};

export const CardHeader = ({
  children,
  className = '',
  ...props
}: CardSectionProps): ReactElement => (
  <div
    className={`px-5 sm:px-7 pt-5 sm:pt-6 pb-4 sm:pb-5 border-b border-hairline ${className}`.trim()}
    {...props}
  >
    {children}
  </div>
);

export const CardContent = ({
  children,
  className = '',
  ...props
}: CardSectionProps): ReactElement => (
  <div className={`px-5 sm:px-7 py-5 sm:py-6 ${className}`.trim()} {...props}>
    {children}
  </div>
);

export const CardFooter = ({
  children,
  className = '',
  ...props
}: CardSectionProps): ReactElement => (
  <div
    className={`px-5 sm:px-7 py-4 sm:py-5 border-t border-hairline bg-paper-deep/40 ${className}`.trim()}
    {...props}
  >
    {children}
  </div>
);
