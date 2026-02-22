import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  readonly children: ReactNode;
  readonly elevated?: boolean;
};

export const Card = ({
  children,
  elevated = false,
  className = '',
  ...props
}: CardProps): React.ReactElement => {
  const baseStyles = elevated
    ? 'bg-surface border border-border rounded-lg shadow-md'
    : 'bg-surface border border-border rounded-lg shadow-sm';

  return (
    <div className={`${baseStyles} ${className}`} {...props}>
      {children}
    </div>
  );
};

type CardHeaderProps = HTMLAttributes<HTMLDivElement> & {
  readonly children: ReactNode;
};

export const CardHeader = ({
  children,
  className = '',
  ...props
}: CardHeaderProps): React.ReactElement => (
  <div className={`px-6 py-4 border-b border-border ${className}`} {...props}>
    {children}
  </div>
);

type CardContentProps = HTMLAttributes<HTMLDivElement> & {
  readonly children: ReactNode;
};

export const CardContent = ({
  children,
  className = '',
  ...props
}: CardContentProps): React.ReactElement => (
  <div className={`px-6 py-4 ${className}`} {...props}>
    {children}
  </div>
);

type CardFooterProps = HTMLAttributes<HTMLDivElement> & {
  readonly children: ReactNode;
};

export const CardFooter = ({
  children,
  className = '',
  ...props
}: CardFooterProps): React.ReactElement => (
  <div
    className={`px-6 py-4 border-t border-border bg-background/50 ${className}`}
    {...props}
  >
    {children}
  </div>
);
