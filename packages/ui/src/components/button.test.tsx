import { describe, expect, it } from 'bun:test';
import { createElement, isValidElement } from 'react';
import { Button, buttonClassName } from './button';

type AnyProps = {
  readonly className?: string;
  readonly type?: string;
  readonly href?: string;
};

const asElement = (node: unknown) => {
  if (!isValidElement<AnyProps>(node)) {
    throw new Error('Button did not return a React element');
  }
  return node;
};

describe('buttonClassName', () => {
  it('defaults to primary + md', () => {
    expect(buttonClassName()).toBe('btn-ink btn-md');
  });

  it('composes variant, size, and an extra class', () => {
    expect(buttonClassName('secondary', 'lg', 'w-full')).toBe(
      'btn-quiet btn-lg w-full',
    );
  });

  it('omits an empty extra class without leaving a trailing space', () => {
    expect(buttonClassName('ghost', 'sm')).toBe('btn-ghost btn-sm');
  });
});

describe('Button', () => {
  it('renders a <button> with the editorial primary styling by default', () => {
    const element = asElement(Button({ children: 'Begin scanning' }));

    expect(element.type).toBe('button');
    expect(element.props.type).toBe('button');
    expect(element.props.className).toBe('btn-ink btn-md');
  });

  it('composes variant, size, and custom classes', () => {
    const element = asElement(
      Button({
        children: 'Read the source',
        variant: 'ghost',
        size: 'sm',
        className: 'w-full',
      }),
    );

    expect(element.props.className).toBe('btn-ghost btn-sm w-full');
  });

  it('merges its className onto the child when asChild is set', () => {
    const child = createElement(
      'a',
      { href: '/scan', className: 'extra' },
      'Begin scanning',
    );

    const element = asElement(
      Button({ asChild: true, size: 'lg', children: child }),
    );

    expect(element.type).toBe('a');
    expect(element.props.href).toBe('/scan');
    expect(element.props.className).toBe('btn-ink btn-lg extra');
  });
});
