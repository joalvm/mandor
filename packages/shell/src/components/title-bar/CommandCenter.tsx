import { useMessages } from '@mandor/i18n';
import { SearchIcon } from '@mandor/icons';
import { Button } from '@mandor/ui';
import { useMemo } from 'react';

import { PALETTE_SURFACE } from '../../command/window-commands.js';
import { windowSurface } from '../../command/window-surface.js';
import { shellStore } from '../../shell-store.js';
import { isApplePlatform } from '../../shortcut/apple-platform.js';
import { DEFAULT_SHORTCUTS } from '../../shortcut/default-shortcuts.js';
import { shortcutLabel } from '../../shortcut/shortcut-label.js';
import { shortcutTable } from '../../shortcut/shortcut-table.js';

const PALETTE_COMMAND = 'shell.commandPalette';

/**
 * The centre of the title row: a button that looks like a field and opens the palette, with the
 * keys that open it too written at its end. It is not a field: nothing is typed into it, the
 * palette is where the search happens.
 *
 * It keeps to one line at any width of the window: the words shrink to an ellipsis before the
 * button breaks in two, and the keys stay whole beside them.
 */
export function CommandCenter() {
    const messages = useMessages('shell');
    const keyboard = useMemo(() => shortcutTable(DEFAULT_SHORTCUTS), []);

    return (
        <Button
            aria-label={messages('searchCommands')}
            className="h-field w-command-center min-w-0 justify-start whitespace-nowrap border-transparent px-pad-control text-text-secondary"
            data-part="command-center"
            onClick={() => {
                windowSurface(PALETTE_SURFACE)?.open(shellStore.getState());
            }}
            variant="chrome"
        >
            <SearchIcon size="sm" />
            <span className="min-w-0 flex-1 truncate text-start">{messages('searchCommands')}</span>
            <PaletteShortcut combination={keyboard.get(PALETTE_COMMAND)?.combination} />
        </Button>
    );
}

function PaletteShortcut({ combination }: { combination: string | undefined }) {
    if (combination === undefined) {
        return null;
    }

    return (
        <span className="shrink-0 text-2xs tabular">
            {shortcutLabel(combination, isApplePlatform())}
        </span>
    );
}
