import type { KeybindingsMap } from 'tinykeys';

import { availableCommands } from '../command/command-registry.js';
import { shellStore } from '../shell-store.js';
import type { Shortcut } from './default-shortcuts.js';

/**
 * The one place a combination turns into work.
 *
 * A shortcut whose command is not registered, or whose condition does not hold, does nothing and
 * lets the key through: the same answer the palette gives by leaving the command off its list.
 */
function fire(command: string, event: KeyboardEvent): void {
    const state = shellStore.getState();
    const found = availableCommands(state).find((each) => each.id === command);

    if (found === undefined) {
        return;
    }

    event.preventDefault();
    found.run(state);
}

export function bindingsOf(shortcuts: readonly Shortcut[]): KeybindingsMap {
    return Object.fromEntries(
        shortcuts.map((shortcut) => [
            shortcut.combination,
            (event: KeyboardEvent) => {
                fire(shortcut.command, event);
            },
        ]),
    );
}
