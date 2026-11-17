import { describe, expect, it } from 'vitest';

import { DEFAULT_SHORTCUTS } from '../../src/index.js';
import { shortcutTable } from '../../src/shortcut/shortcut-table.js';
import type { Shortcut } from '../../src/shortcut/default-shortcuts.js';

describe('the default shortcut table', () => {
    it('gives every combination to at most one command', () => {
        expect(() => shortcutTable(DEFAULT_SHORTCUTS)).not.toThrow();
    });

    /** A silent winner is a shortcut that works on one machine and not on the next. */
    it('names both commands when two of them ask for the same combination', () => {
        const clash: Shortcut[] = [
            ...DEFAULT_SHORTCUTS,
            { combination: '$mod+KeyW', command: 'group.toggleMaximized', scope: 'window' },
        ];

        expect(() => shortcutTable(clash)).toThrow(/tab\.close/);
        expect(() => shortcutTable(clash)).toThrow(/group\.toggleMaximized/);
    });

    it('answers with the shortcut a command was given', () => {
        expect(shortcutTable(DEFAULT_SHORTCUTS).get('tab.close')?.combination).toBe('$mod+KeyW');
    });

    /** The Settings entry of the menu shows the same keys, so the two must name the same ones. */
    it('opens the settings from inside a field with Ctrl or Cmd and a comma', () => {
        const found = shortcutTable(DEFAULT_SHORTCUTS).get('shell.openSettings');

        expect(found).toEqual({
            combination: '$mod+Comma',
            command: 'shell.openSettings',
            scope: 'editing',
        });
    });
});
