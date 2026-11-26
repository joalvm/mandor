import { afterEach, describe, expect, it } from 'vitest';

import { PANE_LAYOUT_COMMANDS } from '../../src/command/pane-layout-commands.js';
import { DEFAULT_SHORTCUTS, paneLayoutStore, shellStore } from '../../src/index.js';

afterEach(() => {
    window.localStorage.clear();
    paneLayoutStore.setState(paneLayoutStore.getInitialState());
});

describe('the command of the layout of the panels', () => {
    it('turns the halves of every tab to the other layout and back', () => {
        const toggle = PANE_LAYOUT_COMMANDS.find(
            (command) => command.id === 'shell.togglePaneLayout',
        );

        toggle?.run(shellStore.getState());

        expect(paneLayoutStore.getState().layout).toBe('horizontal');

        toggle?.run(shellStore.getState());

        expect(paneLayoutStore.getState().layout).toBe('vertical');
    });

    /** Postman's keys for its two-pane view; a field keeps them, they are not the field's. */
    it('has the shortcut of the two-pane view, heard outside a field', () => {
        expect(DEFAULT_SHORTCUTS).toContainEqual({
            combination: '$mod+Alt+KeyV',
            command: 'shell.togglePaneLayout',
            scope: 'window',
        });
    });
});
