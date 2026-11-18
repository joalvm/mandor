import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { selectTabs, shellStore } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openDocPreview } from '../src/lib/open-doc-preview.js';

const README = 'mandor://local-apis/events/doc/readme.md';

beforeEach(() => {
    shellStore.getState().reset();
});

afterEach(() => {
    // The window schedules a session save on every change; nothing here waits for it.
    shellStore.getState().reset();
});

function previews(): string[] {
    return selectTabs(shellStore.getState())
        .filter((tab) => tab.kind === 'doc-preview')
        .map((tab) => tab.id);
}

describe('opening the page of a doc', () => {
    it('opens a preview tab of the resource in the group that asked', () => {
        openDocPreview(README);

        expect(selectTabs(shellStore.getState())).toEqual([
            { id: 'doc-preview-1', kind: 'doc-preview', resource: README },
        ]);
    });

    /** Asked for twice it is the page already open that comes forward. */
    it('brings forward the preview that is already open instead of opening another', () => {
        const shell = shellStore.getState();

        openDocPreview(README);
        shell.openTab(shell.activeGroupId, { id: 'doc-1', kind: 'doc', resource: README });
        shellStore.getState().setActiveTab(ROOT_GROUP_ID, 'doc-1');

        openDocPreview(README);

        expect(previews()).toEqual(['doc-preview-1']);
        expect(leavesOf(shellStore.getState().grid)[0]?.activeTab).toBe('doc-preview-1');
    });

    it('opens one preview for each doc', () => {
        openDocPreview(README);
        openDocPreview('mandor://local-apis/events/doc/otro.md');

        expect(previews()).toEqual(['doc-preview-1', 'doc-preview-2']);
    });
});
