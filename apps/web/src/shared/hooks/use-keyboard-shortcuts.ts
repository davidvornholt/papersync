'use client';

import { useCallback, useEffect } from 'react';

type KeyboardShortcut = {
  readonly key: string;
  readonly ctrl?: boolean;
  readonly shift?: boolean;
  readonly alt?: boolean;
  readonly meta?: boolean;
};

type ShortcutHandler = () => void;

const serializeShortcut = (shortcut: KeyboardShortcut): string => {
  const parts: Array<string> = [];
  if (shortcut.ctrl) {
    parts.push('ctrl');
  }
  if (shortcut.alt) {
    parts.push('alt');
  }
  if (shortcut.shift) {
    parts.push('shift');
  }
  if (shortcut.meta) {
    parts.push('meta');
  }
  parts.push(shortcut.key.toLowerCase());
  return parts.join('+');
};

type UseKeyboardShortcutsOptions = {
  readonly shortcuts: ReadonlyArray<{
    readonly shortcut: KeyboardShortcut;
    readonly handler: ShortcutHandler;
    readonly description?: string;
  }>;
  readonly enabled?: boolean;
};

export const useKeyboardShortcuts = ({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsOptions): void => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) {
        return;
      }

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const pressed: KeyboardShortcut = {
        key: event.key,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey,
      };

      const pressedKey = serializeShortcut(pressed);

      for (const { shortcut, handler } of shortcuts) {
        if (serializeShortcut(shortcut) === pressedKey) {
          event.preventDefault();
          handler();
          break;
        }
      }
    },
    [shortcuts, enabled],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
};

export const SHORTCUTS = {
  generate: { key: 'g', ctrl: true } as KeyboardShortcut,
  settings: { key: ',', ctrl: true } as KeyboardShortcut,
  escape: { key: 'Escape' } as KeyboardShortcut,
  enter: { key: 'Enter' } as KeyboardShortcut,
  home: { key: 'h', ctrl: true } as KeyboardShortcut,
} as const;
