import { ROOT_GROUP_ID } from '@mandor/ipc';
import { shellStore } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { nextDocTabId } from '../src/lib/doc-tab-id.js';

const README = 'mandor://local-apis/events/doc/readme.md';

function open(groupId: string, id: string): void {
    shellStore.getState().openTab(groupId, { id, kind: 'doc', resource: README });
}

beforeEach(() => {
    shellStore.getState().reset();
});

afterEach(() => {
    // The window schedules a session save on every change; nothing here waits for it.
    shellStore.getState().reset();
});

describe('the id of one more view of a doc', () => {
    it('starts at one when nothing is open', () => {
        expect(nextDocTabId(shellStore.getState().grid)).toBe('doc-1');
    });

    it('takes the lowest number that is free, so ids do not run away', () => {
        open(ROOT_GROUP_ID, 'doc-1');
        open(ROOT_GROUP_ID, 'doc-3');

        expect(nextDocTabId(shellStore.getState().grid)).toBe('doc-2');
    });

    it('looks in every group of the window', () => {
        const beside = shellStore.getState().splitGroup(ROOT_GROUP_ID, 'row');

        open(ROOT_GROUP_ID, 'doc-1');
        open(beside, 'doc-2');

        expect(nextDocTabId(shellStore.getState().grid)).toBe('doc-3');
    });

    it('numbers each prefix on its own', () => {
        open(ROOT_GROUP_ID, 'doc-1');

        expect(nextDocTabId(shellStore.getState().grid, 'doc-preview')).toBe('doc-preview-1');
    });
});
