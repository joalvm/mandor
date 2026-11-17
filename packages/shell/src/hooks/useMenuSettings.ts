import { useEffect } from 'react';

import { availableCommands } from '../command/command-registry.js';
import { shellStore } from '../shell-store.js';
import { bridge } from '../bridge.js';

/** The command the Settings entry of the menu stands for: the one the keyboard and the palette run. */
const OPEN_SETTINGS = 'shell.openSettings';

/**
 * Opens the settings when the menu asks for them. The menu lives in main and the dialog lives
 * here, so the click arrives as a push and runs the same command as the shortcut and the palette:
 * one way in, and a window that has not built the dialog yet answers by doing nothing.
 */
export function useMenuSettings(): void {
    useEffect(
        () =>
            bridge.menu.onSettings(() => {
                const state = shellStore.getState();

                availableCommands(state)
                    .find((each) => each.id === OPEN_SETTINGS)
                    ?.run(state);
            }),
        [],
    );
}
