import {
  type ButtonHTMLAttributes,
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

type CommonProps = {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly className?: string;
};

type ButtonAsButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    readonly asChild?: false;
    readonly children: ReactNode;
  };

type ButtonAsChildProps = CommonProps & {
  readonly asChild: true;
  /** Exactly one element child — for example a Next.js `<Link>` or an `<a>`. */
  readonly children: ReactElement<{ readonly className?: string }>;
};

export type ButtonProps = ButtonAsButtonProps | ButtonAsChildProps;

const variantClass: Record<ButtonVariant, string> = {
  primary: 'btn-ink',
  secondary: 'btn-quiet',
  ghost: 'btn-ghost',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
};

/**
 * Compose the canonical button class string. Useful when the styled element
 * cannot be rendered through `<Button>` directly — for example when Tailwind
 * needs to tag a third-party trigger that already has its own component
 * shape.
 */
export const buttonClassName = (
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra = '',
): string =>
  [variantClass[variant], sizeClass[size], extra].filter(Boolean).join(' ');

/**
 * The single editorial button. Renders a `<button>` by default, or merges
 * its className into the lone child element when `asChild` is set, so that
 * Next.js `<Link>`s and other interactive elements can adopt the same
 * appearance without forking the styling.
 */
export const Button = (props: ButtonProps): ReactElement => {
  const {
    variant = 'primary',
    size = 'md',
    className = '',
    children,
    ...rest
  } = props;
  const composed = buttonClassName(variant, size, className);

  if (rest.asChild) {
    const child = Children.only(
      children as ReactElement<{ className?: string }>,
    );
    if (!isValidElement<{ readonly className?: string }>(child)) {
      throw new Error(
        'Button(asChild) requires exactly one valid React element child.',
      );
    }
    const childClassName = child.props.className ?? '';
    return cloneElement(child, {
      className: [composed, childClassName].filter(Boolean).join(' '),
    });
  }

  const {
    asChild: _asChild,
    type,
    ...buttonRest
  } = rest as {
    readonly asChild?: false;
    readonly type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
  } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>;

  return (
    <button type={type ?? 'button'} className={composed} {...buttonRest}>
      {children as ReactNode}
    </button>
  );
};
