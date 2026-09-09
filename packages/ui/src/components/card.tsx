import type { HTMLAttributes, ReactElement, ReactNode } from 'react';
export type CardProps = HTMLAttributes<HTMLDivElement> & {
  readonly children: ReactNode;
};

export const Card = ({
  children,
  className = '',
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
    className={`border-hairline border-b px-5 pt-5 pb-4 sm:px-7 sm:pt-6 sm:pb-5 ${className}`.trim()}
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
  <div className={`p-5 sm:px-7 sm:py-6 ${className}`.trim()} {...props}>
    {children}
  </div>
);

export const CardFooter = ({
  children,
  className = '',
  ...props
}: CardSectionProps): ReactElement => (
  <div
    className={`border-hairline border-t bg-paper-deep/40 px-5 py-4 sm:px-7 sm:py-5 ${className}`.trim()}
    {...props}
  >
    {children}
  </div>
);
