import { useMessages } from '@mandor/i18n';
import { ErrorIcon, WarningIcon } from '@mandor/icons';
import { Badge, IconButton } from '@mandor/ui';
import { useMemo } from 'react';
import { useStore } from 'zustand';

import { consoleCounts } from '../../console/console-entries.js';
import { consoleStore } from '../../console/console-store.js';
import { isApplePlatform } from '../../shortcut/apple-platform.js';
import { DEFAULT_SHORTCUTS } from '../../shortcut/default-shortcuts.js';
import { shortcutLabel } from '../../shortcut/shortcut-label.js';
import { shortcutTable } from '../../shortcut/shortcut-table.js';

const TOGGLE_COMMAND = 'shell.toggleConsole';

/**
 * The switch of the console on the status line, with how many faults and warnings it holds, so
 * a script that broke is noticed with the console put away, as an editor counts its problems.
 * Its tooltip says the keys that do the same, so the hand learns them from the button.
 */
export function ConsoleToggle() {
    const messages = useMessages('shell');
    const open = useStore(consoleStore, (state) => state.open);
    const toggle = useStore(consoleStore, (state) => state.toggle);
    const errors = useStore(consoleStore, (state) => consoleCounts(state.entries).errors);
    const warnings = useStore(consoleStore, (state) => consoleCounts(state.entries).warnings);
    const combination = useMemo(
        () => shortcutTable(DEFAULT_SHORTCUTS).get(TOGGLE_COMMAND)?.combination,
        [],
    );

    return (
        <div className="flex items-center gap-gap-tight" data-part="console-toggle">
            <IconButton
                active={open}
                icon="console"
                iconSize="sm"
                label={messages(open ? 'consoleHide' : 'consoleShow')}
                onClick={toggle}
                shortcut={
                    combination === undefined
                        ? undefined
                        : shortcutLabel(combination, isApplePlatform())
                }
                size="xs"
            />
            <ErrorCount count={errors} label={messages('consoleErrors', { count: errors })} />
            <WarningCount
                count={warnings}
                label={messages('consoleWarnings', { count: warnings })}
            />
        </div>
    );
}

type CountProps = { count: number; label: string };

/** The faults the console holds, with the glyph a fault carries in it; nothing while there are none. */
function ErrorCount({ count, label }: CountProps) {
    if (count === 0) {
        return null;
    }

    return (
        <Badge aria-label={label} count tone="error">
            <ErrorIcon size="sm" />
            {count}
        </Badge>
    );
}

/** The warnings the console holds, with the glyph a warning carries in it; nothing while there are none. */
function WarningCount({ count, label }: CountProps) {
    if (count === 0) {
        return null;
    }

    return (
        <Badge aria-label={label} count tone="warning">
            <WarningIcon size="sm" />
            {count}
        </Badge>
    );
}
