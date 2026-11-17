import { createFakeBridge } from '@mandor/ipc/testing';
import { ROOT_GROUP_ID } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { atTab, closableTabs, othersOf, rightOf, shownTab } from '../../src/command/tab-targets.js';
import type { ShellStore, Tab } from '../../src/index.js';
import { createShellStore } from '../../src/shell-store.js';
import { declareTabKindSpec } from '../../src/testing/tab-kind.js';

let undo: (() => void)[] = [];

function tab(id: string, kind = 'doc'): Tab {
    return { id, kind, resource: `mandor://demo/payments/doc/${id}.md` };
}

function stateWith(...tabs: Tab[]): ShellStore {
    const api = createShellStore(createFakeBridge());

    for (const each of tabs) {
        api.getState().openTab(ROOT_GROUP_ID, each);
    }

    return api.getState();
}

function ids(tabs: readonly Tab[]): string[] {
    return tabs.map((each) => each.id);
}

beforeEach(() => {
    undo = [
        declareTabKindSpec({
            closable: true,
            icon: 'doc',
            id: 'doc',
            title: (resource) => resource,
        }),
        declareTabKindSpec({
            closable: false,
            icon: 'doc',
            id: 'fixed',
            title: (resource) => resource,
        }),
    ];
});

afterEach(() => {
    for (const each of undo) {
        each();
    }
});

describe('what a tab command acts on', () => {
    it('asks about another tab as if it stood in front, without moving the window', () => {
        const state = stateWith(tab('one'), tab('two'), tab('three'));
        const asked = atTab(state, ROOT_GROUP_ID, 'one');

        expect(shownTab(state)?.id).toBe('three');
        expect(shownTab(asked)?.id).toBe('one');
        expect(ids(rightOf(asked))).toEqual(['two', 'three']);
        expect(ids(othersOf(asked))).toEqual(['two', 'three']);
    });

    it('never counts a tab its kind keeps from closing', () => {
        const state = stateWith(tab('pinned', 'fixed'), tab('one'));

        expect(ids(closableTabs(state))).toEqual(['one']);
        expect(ids(rightOf(atTab(state, ROOT_GROUP_ID, 'pinned')))).toEqual(['one']);
    });

    /** Pinning a tab is asking for it to stay: no closing of many takes it. */
    it('leaves a pinned tab out of every closing of many', () => {
        const api = createShellStore(createFakeBridge());

        for (const each of [tab('one'), tab('two'), tab('three')]) {
            api.getState().openTab(ROOT_GROUP_ID, each);
        }

        api.getState().pinTab('two');

        const asked = atTab(api.getState(), ROOT_GROUP_ID, 'two');

        expect(ids(closableTabs(asked))).toEqual(['one', 'three']);
        expect(ids(othersOf(asked))).toEqual(['one', 'three']);
        expect(ids(rightOf(atTab(api.getState(), ROOT_GROUP_ID, 'one')))).toEqual(['three']);
    });
});
