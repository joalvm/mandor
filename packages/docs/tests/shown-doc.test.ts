import { shellStore } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { shownDoc } from '../src/lib/shown-doc.js';

const README = 'mandor://local-apis/events/doc/readme.md';
const CONNECTION = 'mandor://local-apis/events/connection/ws-echo';

function show(id: string, kind: string, resource: string): void {
    const shell = shellStore.getState();

    shell.openTab(shell.activeGroupId, { id, kind, resource });
    shellStore.getState().setActiveTab(shell.activeGroupId, id);
}

beforeEach(() => {
    shellStore.getState().reset();
});

afterEach(() => {
    // The window schedules a session save on every change; nothing here waits for it.
    shellStore.getState().reset();
});

describe('the doc being read right now', () => {
    it('is nothing while no tab is open', () => {
        expect(shownDoc(shellStore.getState())).toBeNull();
    });

    it('is the resource of the doc tab in front', () => {
        show('doc-1', 'doc', README);

        expect(shownDoc(shellStore.getState())).toBe(README);
    });

    it('is the same resource when the page of the doc is the one in front', () => {
        show('doc-preview-1', 'doc-preview', README);

        expect(shownDoc(shellStore.getState())).toBe(README);
    });

    it('is nothing when the tab in front is anything else', () => {
        show('doc-1', 'doc', README);
        show('connection-1', 'connection', CONNECTION);

        expect(shownDoc(shellStore.getState())).toBeNull();
    });

    it('goes back to the doc when it is brought forward again', () => {
        show('doc-1', 'doc', README);
        show('connection-1', 'connection', CONNECTION);
        shellStore.getState().setActiveTab(shellStore.getState().activeGroupId, 'doc-1');

        expect(shownDoc(shellStore.getState())).toBe(README);
    });
});
