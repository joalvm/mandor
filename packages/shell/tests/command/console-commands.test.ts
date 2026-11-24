import { afterEach, describe, expect, it } from 'vitest';

import { CONSOLE_COMMANDS } from '../../src/command/console-commands.js';
import { consoleStore, DEFAULT_SHORTCUTS, shellStore } from '../../src/index.js';

afterEach(() => {
    consoleStore.getState().hide();
});

describe('the command of the console', () => {
    it('brings the console out and puts it away again', () => {
        const toggle = CONSOLE_COMMANDS.find((command) => command.id === 'shell.toggleConsole');

        toggle?.run(shellStore.getState());

        expect(consoleStore.getState().open).toBe(true);

        toggle?.run(shellStore.getState());

        expect(consoleStore.getState().open).toBe(false);
    });

    /** The keys of the debug console of the code editors. */
    it('has a shortcut that works from inside a field', () => {
        expect(DEFAULT_SHORTCUTS).toContainEqual({
            combination: '$mod+Alt+KeyC',
            command: 'shell.toggleConsole',
            scope: 'editing',
        });
    });
});
