import { DependencyList } from 'react';
import { useHotkeys, Options } from 'react-hotkeys-hook';

type HotkeyCallback = (event: KeyboardEvent) => void;

interface KeyboardShortcutOptions {
  /** Whether the shortcut is currently active (default: true) */
  enabled?: boolean;
  /** React dependency array for the callback */
  deps?: DependencyList;
}

/**
 * Adapter hook for keyboard shortcuts.
 * Wraps react-hotkeys-hook with project defaults.
 * 
 * @param keys - Hotkey string(s): 'escape', 'ctrl+k', ['arrowup', 'arrowdown']
 * @param callback - Function to call when hotkey is pressed
 * @param options - Optional config: { enabled?, deps? }
 * 
 * @example
 * // Simple usage
 * useKeyboardShortcut('escape', handleClose);
 * 
 * // With dependencies
 * useKeyboardShortcut('escape', handleClose, { deps: [someState] });
 * 
 * // Conditional
 * useKeyboardShortcut('escape', handleClose, { enabled: isOpen });
 * 
 * // Multiple keys
 * useKeyboardShortcut(['arrowup', 'arrowdown'], handleNav, { deps: [items] });
 */
export function useKeyboardShortcut(
  keys: string | string[],
  callback: HotkeyCallback,
  options?: KeyboardShortcutOptions
) {
  const hotkeyOptions: Options = {
    enableOnFormTags: false, // Project default: don't trigger in form inputs
    enabled: options?.enabled ?? true,
  };

  useHotkeys(keys, callback, hotkeyOptions, options?.deps ?? []);
}

