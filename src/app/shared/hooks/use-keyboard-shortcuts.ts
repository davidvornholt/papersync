"use client";

import { useCallback, useEffect } from "react";

// ============================================================================
// Types
// ============================================================================

type KeyboardShortcut = {
  readonly key: string;
  readonly ctrl?: boolean;
  readonly shift?: boolean;
  readonly alt?: boolean;
  readonly meta?: boolean;
};

type ShortcutHandler = () => void;

// ============================================================================
// Utility to create shortcut key
// ============================================================================

const serializeShortcut = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push("ctrl");
  if (shortcut.alt) parts.push("alt");
  if (shortcut.shift) parts.push("shift");
  if (shortcut.meta) parts.push("meta");
  parts.push(shortcut.key.toLowerCase());
  return parts.join("+");
};

// ============================================================================
// Hook
// ============================================================================

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
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
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
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);
};

// ============================================================================
// Common Shortcuts
// ============================================================================

export const SHORTCUTS = {
  GENERATE: { key: "g", ctrl: true } as KeyboardShortcut,
  SETTINGS: { key: ",", ctrl: true } as KeyboardShortcut,
  ESCAPE: { key: "Escape" } as KeyboardShortcut,
  ENTER: { key: "Enter" } as KeyboardShortcut,
  HOME: { key: "h", ctrl: true } as KeyboardShortcut,
} as const;
