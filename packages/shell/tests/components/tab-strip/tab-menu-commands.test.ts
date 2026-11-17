import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    inFront,
    isAvailable,
    offeredOf,
} from '../../../src/components/tab-strip/tab-menu-commands.js';
import { registerShellCommands, shellStore, type Tab } from '../../../src/index.js';
import { declareTabKindSpec } from '../../../src/testing/tab-kind.js';

let undo: (() => void)[] = [];

function tab(id: string): Tab {
    return { id, kind: 'doc', resource: `mandor://demo/payments/doc/${id}` };
}

function open(...tabs: Tab[]): void {
    for (const each of tabs) {
        shellStore.getState().openTab(ROOT_GROUP_ID, each);
    }
}

beforeEach(() => {
    undo = [
        registerShellCommands(),
        declareTabKindSpec({ closable: true, icon: 'doc', id: 'doc', title: (id) => id }),
    ];
});

afterEach(() => {
    shellStore.getState().reset();

    for (const each of undo) {
        each();
    }
});

describe('what the menu of a tab offers', () => {
    it('offers the commands a section names, in its order, and leaves out what the tab never uses', () => {
        open(tab('one'));

        const offered = offeredOf(
            [
                { id: 'tab.closeAll' },
                { id: 'no.such.command' },
                { id: 'tab.keepOpen', offered: () => false },
                { id: 'tab.close' },
            ],
            shellStore.getState(),
        );

        expect(offered.map((command) => command.id)).toEqual(['tab.closeAll', 'tab.close']);
    });

    it('tells a command that cannot run on the tab from one that always can', () => {
        const [command] = offeredOf([{ id: 'tab.close' }], shellStore.getState());

        if (command === undefined) {
            throw new Error('The shell registers no close.');
        }

        expect(isAvailable(shellStore.getState(), { ...command, when: undefined })).toBe(true);
        expect(isAvailable(shellStore.getState(), { ...command, when: () => false })).toBe(false);
    });

    it('puts the tab it was opened on in front before a command acts on it', () => {
        open(tab('one'), tab('two'));

        const state = inFront(ROOT_GROUP_ID, 'one');

        expect(leavesOf(state.grid)[0]?.activeTab).toBe('one');
    });
});
