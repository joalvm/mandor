import { useTranslator } from '@mandor/i18n';
import { useMemo } from 'react';

import { availableCommands } from '../command/command-registry.js';
import { DEFAULT_SHORTCUTS } from '../shortcut/default-shortcuts.js';
import { isApplePlatform } from '../shortcut/apple-platform.js';
import { shortcutLabel } from '../shortcut/shortcut-label.js';
import { shortcutTable } from '../shortcut/shortcut-table.js';
import type { NamedCommand } from '../command/ranked-commands.js';
import { useShellStore } from './useShellStore.js';

/** What the window can do right now, each already reading in the language on screen. */
export function useNamedCommands(): NamedCommand[] {
    const state = useShellStore((each) => each);
    const translate = useTranslator();
    const keyboard = useMemo(() => shortcutTable(DEFAULT_SHORTCUTS), []);
    const apple = useMemo(() => isApplePlatform(), []);

    return useMemo(
        () =>
            availableCommands(state).map((command) => {
                const shortcut = keyboard.get(command.id)?.combination;

                return {
                    ...command,
                    name: translate(command.title, command.titleValues),
                    shortcut: shortcut === undefined ? undefined : shortcutLabel(shortcut, apple),
                };
            }),
        [apple, keyboard, state, translate],
    );
}
