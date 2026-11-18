import { createFakeBridge } from '@mandor/ipc/testing';
import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createShellStore, type ShellStoreApi } from '../../src/shell-store.js';
import { unsavedQuestion } from '../../src/tab/unsaved-question.js';
import { declareTabKindSpec } from '../../src/testing/tab-kind.js';

const UNREGISTER: (() => void)[] = [];

function store(): ShellStoreApi {
    return createShellStore(createFakeBridge());
}

function tabIds(api: ShellStoreApi): string[] {
    return leavesOf(api.getState().grid).flatMap((leaf) => leaf.tabs.map((tab) => tab.id));
}

afterEach(() => {
    for (const unregister of UNREGISTER.splice(0)) {
        unregister();
    }
});

const unsaved = new Set<string>();

function registerUnsavedKind(): void {
    UNREGISTER.push(
        declareTabKindSpec({
            closable: true,
            dirty: (tabId) => unsaved.has(tabId),
            icon: 'send',
            id: 'draft',
            title: (resource) => resource,
        }),
    );
}

function openDraft(api: ShellStoreApi, id: string, resource = `mandor://r/w/item/${id}`): void {
    api.getState().openTab(ROOT_GROUP_ID, { id, kind: 'draft', resource });
}

/** The tab the window is asking about, once the asking reached it. */
async function askedAbout(): Promise<string | undefined> {
    await vi.waitFor(() => {
        expect(unsavedQuestion.getState().asking).not.toBeNull();
    });

    return unsavedQuestion.getState().asking?.tab.id;
}

describe('closing tabs with unsaved work (close-requests)', () => {
    afterEach(() => {
        unsaved.clear();
        unsavedQuestion.setState({ asking: null });
    });

    it('closes the saved at once and asks about each unsaved one in turn, in front', async () => {
        const api = store();

        registerUnsavedKind();
        openDraft(api, 'one');
        openDraft(api, 'two');
        openDraft(api, 'three');
        unsaved.add('one');
        unsaved.add('three');

        const closing = api.getState().requestCloseTabs(ROOT_GROUP_ID, ['one', 'two', 'three']);

        expect(tabIds(api)).toEqual(['one', 'three']);
        await expect(askedAbout()).resolves.toBe('one');
        expect(leavesOf(api.getState().grid)[0]?.activeTab).toBe('one');

        unsavedQuestion.getState().answer(true);

        await expect(askedAbout()).resolves.toBe('three');
        expect(tabIds(api)).toEqual(['three']);

        unsavedQuestion.getState().answer(true);

        await expect(closing).resolves.toBe(true);
        expect(tabIds(api)).toEqual([]);
    });

    it('keeps the tab asked about, and every one after it, when the answer is to stay', async () => {
        const api = store();

        registerUnsavedKind();
        openDraft(api, 'one');
        openDraft(api, 'two');
        unsaved.add('one');
        unsaved.add('two');

        const closing = api.getState().requestCloseTabs(ROOT_GROUP_ID, ['one', 'two']);

        await askedAbout();
        unsavedQuestion.getState().answer(false);

        await expect(closing).resolves.toBe(false);
        expect(tabIds(api)).toEqual(['one', 'two']);
        expect(unsavedQuestion.getState().asking).toBeNull();
    });

    it('asks nothing while another view that stays open still holds the work', async () => {
        const api = store();
        const resource = 'mandor://r/w/item/shared';

        registerUnsavedKind();
        openDraft(api, 'one', resource);
        api.getState().openTabAside({ id: 'one~2', kind: 'draft', resource });
        unsaved.add('one');

        await expect(api.getState().requestCloseTab(ROOT_GROUP_ID, 'one')).resolves.toBe(true);

        expect(tabIds(api)).toEqual(['one~2']);
        expect(unsavedQuestion.getState().asking).toBeNull();
    });
});
