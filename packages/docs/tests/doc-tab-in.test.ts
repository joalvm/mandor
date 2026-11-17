import { ROOT_GROUP_ID } from '@mandor/ipc';
import { shellStore } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { docTabIn } from '../src/lib/doc-tab-in.js';
import { showDocTab } from '../src/lib/show-doc-tab.js';

const README = 'mandor://local-apis/events/doc/readme.md';

function open(groupId: string, id: string, kind: string): void {
    shellStore.getState().openTab(groupId, { id, kind, resource: README });
}

beforeEach(() => {
    shellStore.getState().reset();
});

afterEach(() => {
    // The window schedules a session save on every change; nothing here waits for it.
    shellStore.getState().reset();
});

describe('where a doc is already open', () => {
    it('finds the tab showing it, and the group holding that tab', () => {
        open(ROOT_GROUP_ID, 'doc-1', 'doc');

        expect(docTabIn(shellStore.getState().grid, README, 'doc')).toEqual({
            groupId: ROOT_GROUP_ID,
            tabId: 'doc-1',
        });
    });

    /** The document and the page of that document name one file and are not one tab. */
    it('tells the document from the page of it', () => {
        const beside = shellStore.getState().splitGroup(ROOT_GROUP_ID, 'row');

        open(ROOT_GROUP_ID, 'doc-1', 'doc');
        open(beside, 'doc-preview-1', 'doc-preview');

        const grid = shellStore.getState().grid;

        expect(docTabIn(grid, README, 'doc')?.tabId).toBe('doc-1');
        expect(docTabIn(grid, README, 'doc-preview')?.tabId).toBe('doc-preview-1');
    });

    it('answers nothing for a file no tab is showing', () => {
        expect(docTabIn(shellStore.getState().grid, README, 'doc')).toBeNull();
    });

    /** A tab behind another one, in a half nobody is looking at, reads as an app that did nothing. */
    it('brings a tab forward with the focus of its group', () => {
        const beside = shellStore.getState().splitGroup(ROOT_GROUP_ID, 'row');

        open(beside, 'doc-1', 'doc');
        open(beside, 'doc-2', 'doc');
        shellStore.getState().focusGroup(ROOT_GROUP_ID);

        showDocTab({ groupId: beside, tabId: 'doc-1' });

        const state = shellStore.getState();

        expect(state.activeGroupId).toBe(beside);
        expect(state.grid).toBeDefined();
        expect(docTabIn(state.grid, README, 'doc')?.tabId).toBe('doc-1');
    });
});
