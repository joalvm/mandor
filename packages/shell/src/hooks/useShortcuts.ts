import { useEffect } from 'react';
import { tinykeys } from 'tinykeys';

import { shellStore } from '../shell-store.js';
import { bindingsOf } from '../shortcut/shortcut-bindings.js';
import { DEFAULT_SHORTCUTS, type Shortcut } from '../shortcut/default-shortcuts.js';
import { shortcutTable } from '../shortcut/shortcut-table.js';

/**
 * A walk down the order of use lasts while the modifier is held. Letting go of it, or leaving the
 * window, ends it where it stopped.
 */
function settle(event: Event): void {
    if (event instanceof KeyboardEvent && (event.ctrlKey || event.metaKey)) {
        return;
    }

    shellStore.getState().endRecentWalk();
}

function scoped(shortcuts: readonly Shortcut[], scope: Shortcut['scope']): Shortcut[] {
    return shortcuts.filter((each) => each.scope === scope);
}

/**
 * Listens for the shortcuts of the window, and only of the window: nothing is registered with the
 * operating system, so another app of the same machine keeps its own keyboard.
 *
 * The two scopes are two listeners because that is what tells them apart: the one for the window
 * lets `tinykeys` skip whatever is typed into a field, and the one for editing does not.
 */
export function useShortcuts(shortcuts: readonly Shortcut[] = DEFAULT_SHORTCUTS): void {
    useEffect(() => {
        const table = [...shortcutTable(shortcuts).values()];
        const stop = [
            tinykeys(window, bindingsOf(scoped(table, 'window'))),
            tinykeys(window, bindingsOf(scoped(table, 'editing')), { ignore: () => false }),
        ];

        window.addEventListener('keyup', settle);
        window.addEventListener('blur', settle);

        return () => {
            window.removeEventListener('keyup', settle);
            window.removeEventListener('blur', settle);

            for (const each of stop) {
                each();
            }
        };
    }, [shortcuts]);
}
