import { useMessages } from '@mandor/i18n';
import { CornerCount, IconButton } from '@mandor/ui';
import { useMemo } from 'react';
import { useStore } from 'zustand';

import { consoleCounts } from '../../console/console-entries.js';
import { consoleStore } from '../../console/console-store.js';
import { isApplePlatform } from '../../shortcut/apple-platform.js';
import { DEFAULT_SHORTCUTS } from '../../shortcut/default-shortcuts.js';
import { shortcutLabel } from '../../shortcut/shortcut-label.js';
import { shortcutTable } from '../../shortcut/shortcut-table.js';

const TOGGLE_COMMAND = 'shell.toggleConsole';

/** What a click does, and the faults waiting in the console when there are any. */
const LABEL = {
    closed: { clean: 'consoleShow', faulty: 'consoleShowErrors' },
    open: { clean: 'consoleHide', faulty: 'consoleHideErrors' },
} as const;

/**
 * The switch of the console on the status line, with how many faults it holds marked on its
 * corner, so a script that broke is noticed with the console put away. Warnings leave no mark:
 * they wait in the console, and a mark for each would cry wolf. Its tooltip says the keys that
 * do the same, so the hand learns them from the button.
 */
export function ConsoleToggle() {
    const messages = useMessages('shell');
    const open = useStore(consoleStore, (state) => state.open);
    const toggle = useStore(consoleStore, (state) => state.toggle);
    const errors = useStore(consoleStore, (state) => consoleCounts(state.entries).errors);
    const combination = useMemo(
        () => shortcutTable(DEFAULT_SHORTCUTS).get(TOGGLE_COMMAND)?.combination,
        [],
    );
    const label = LABEL[open ? 'open' : 'closed'][errors > 0 ? 'faulty' : 'clean'];

    return (
        <CornerCount count={errors} tone="error">
            <IconButton
                active={open}
                data-part="console-toggle"
                icon="console"
                iconSize="sm"
                label={messages(label, { count: errors })}
                onClick={toggle}
                shortcut={
                    combination === undefined
                        ? undefined
                        : shortcutLabel(combination, isApplePlatform())
                }
                size="xs"
            />
        </CornerCount>
    );
}
