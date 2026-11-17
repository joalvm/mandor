import { createFakeBridge } from '@mandor/ipc/testing';
import { afterEach, describe, expect, it } from 'vitest';

import {
    availableCommands,
    registerCommand,
    type Command,
    type ShellStore,
} from '../../src/index.js';
import { createShellStore } from '../../src/shell-store.js';

const cleanups: (() => void)[] = [];

function register(command: Command): void {
    cleanups.push(registerCommand(command));
}

function state(): ShellStore {
    return createShellStore(createFakeBridge()).getState();
}

function idsOf(shell: ShellStore): string[] {
    return availableCommands(shell).map((command) => command.id);
}

function noop(): void {
    return undefined;
}

afterEach(() => {
    while (cleanups.length > 0) {
        cleanups.pop()?.();
    }
});

describe('the command registry of the shell', () => {
    /** The condition is what a command answers with, not something the palette has to know. */
    it('lists the command whose condition holds and leaves out the one whose does not', () => {
        register({
            category: 'commands:categoryTab',
            icon: 'doc',
            id: 'test.open',
            run: noop,
            title: 'a',
        });
        register({
            category: 'commands:categoryTab',
            icon: 'doc',
            id: 'test.shut',
            run: noop,
            title: 'b',
            when: () => false,
        });

        expect(idsOf(state())).toEqual(['test.open']);
    });

    it('reads the condition against the state it is given', () => {
        const api = createShellStore(createFakeBridge());

        register({
            category: 'commands:categoryGroup',
            icon: 'doc',
            id: 'test.split',
            run: noop,
            title: 'a',
            when: (shell) => shell.activeGroupId === 'group-2',
        });

        expect(idsOf(api.getState())).toEqual([]);

        api.getState().splitGroup('root', 'row');
        api.getState().focusGroup('group-2');

        expect(idsOf(api.getState())).toEqual(['test.split']);
    });

    it('stops listing a command once its registration is undone', () => {
        const undo = registerCommand({
            category: 'commands:categoryTab',
            icon: 'doc',
            id: 'test.gone',
            run: noop,
            title: 'a',
        });

        undo();

        expect(idsOf(state())).toEqual([]);
    });

    /** A command is a function over the store, so running it is what changes the window. */
    it('runs a command against the store the caller hands it', () => {
        const api = createShellStore(createFakeBridge());

        register({
            category: 'commands:categoryGroup',
            icon: 'doc',
            id: 'test.run',
            run: (shell) => {
                shell.splitGroup(shell.activeGroupId, 'row');
            },
            title: 'a',
        });

        availableCommands(api.getState())[0]?.run(api.getState());

        expect(api.getState().grid.kind).toBe('branch');
    });
});
