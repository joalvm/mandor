import { afterEach, describe, expect, it } from 'vitest';

import { registeredCommands } from '../../src/command/command-registry.js';
import { GROUP_COMMANDS } from '../../src/command/group-commands.js';
import { registerShellCommands } from '../../src/command/register-shell-commands.js';
import { TAB_COMMANDS } from '../../src/command/tab-commands.js';

let undo: (() => void) | undefined;

afterEach(() => {
    undo?.();
    undo = undefined;
});

function registeredIds(): string[] {
    return registeredCommands().map((command) => command.id);
}

describe('registering the commands of the shell', () => {
    it('declares the commands of the groups and of the tabs of the window', () => {
        undo = registerShellCommands();

        const ids = registeredIds();

        for (const command of [...GROUP_COMMANDS, ...TAB_COMMANDS]) {
            expect(ids).toContain(command.id);
        }
    });

    it('declares every command once, whatever part of the window it reaches', () => {
        undo = registerShellCommands();

        const ids = registeredIds();

        expect(new Set(ids).size).toBe(ids.length);
        expect(ids.length).toBeGreaterThan(GROUP_COMMANDS.length + TAB_COMMANDS.length);
    });

    it('takes them all back with the cleanup it returns', () => {
        const before = registeredIds();
        const stop = registerShellCommands();

        stop();

        expect(registeredIds()).toEqual(before);
    });
});
