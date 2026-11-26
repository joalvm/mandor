import { useMessages } from '@mandor/i18n';
import type { IconName } from '@mandor/icons';
import { IconButton } from '@mandor/ui';
import { useMemo } from 'react';

import { usePaneLayout } from '../../hooks/usePaneLayout.js';
import { togglePaneLayout, type PaneLayout } from '../../pane-layout/pane-layout.js';
import { isApplePlatform } from '../../shortcut/apple-platform.js';
import { DEFAULT_SHORTCUTS } from '../../shortcut/default-shortcuts.js';
import { shortcutLabel } from '../../shortcut/shortcut-label.js';
import { shortcutTable } from '../../shortcut/shortcut-table.js';

const TOGGLE_COMMAND = 'shell.togglePaneLayout';

/** The glyph draws the layout standing now: the second half on the right, or at the bottom. */
const GLYPH: Readonly<Record<PaneLayout, IconName>> = {
    horizontal: 'layout-horizontal',
    vertical: 'layout-vertical',
};

const LABEL = {
    horizontal: 'paneLayoutHorizontal',
    vertical: 'paneLayoutVertical',
} as const satisfies Record<PaneLayout, string>;

/**
 * The switch of the layout on the status line: its glyph says how the halves of a request or a
 * connection stand, and a click turns every tab to the other way. Its tooltip names the layout,
 * the one a click gives and the keys that do the same.
 */
export function PaneLayoutToggle() {
    const messages = useMessages('shell');
    const layout = usePaneLayout();
    const combination = useMemo(
        () => shortcutTable(DEFAULT_SHORTCUTS).get(TOGGLE_COMMAND)?.combination,
        [],
    );

    return (
        <IconButton
            data-part="pane-layout-toggle"
            icon={GLYPH[layout]}
            iconSize="sm"
            label={messages(LABEL[layout])}
            onClick={togglePaneLayout}
            shortcut={
                combination === undefined
                    ? undefined
                    : shortcutLabel(combination, isApplePlatform())
            }
            size="xs"
        />
    );
}
