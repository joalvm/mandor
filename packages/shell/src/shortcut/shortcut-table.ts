import { ShortcutConflictError } from './shortcut-conflict-error.js';
import type { Shortcut } from './default-shortcuts.js';

/**
 * The table read by command, which is how both the keyboard and the palette ask about it.
 *
 * A repeated combination stops the window here instead of picking a winner. A shortcut that works
 * on one build and not on the next is a bug nobody reports, because it looks like a typo.
 */
export function shortcutTable(shortcuts: readonly Shortcut[]): ReadonlyMap<string, Shortcut> {
    const byCommand = new Map<string, Shortcut>();
    const byCombination = new Map<string, string>();

    for (const shortcut of shortcuts) {
        const taken = byCombination.get(shortcut.combination);

        if (taken !== undefined) {
            throw new ShortcutConflictError(shortcut.combination, taken, shortcut.command);
        }

        byCombination.set(shortcut.combination, shortcut.command);
        byCommand.set(shortcut.command, shortcut);
    }

    return byCommand;
}
