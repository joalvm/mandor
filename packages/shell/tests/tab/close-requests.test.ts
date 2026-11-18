import { createFakeBridge } from '@mandor/ipc/testing';
import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createShellStore, type ShellStoreApi } from '../../src/shell-store.js';
import { declareTabKindSpec } from '../../src/testing/tab-kind.js';

const UNREGISTER: (() => void)[] = [];

function store(): ShellStoreApi {
    return createShellStore(createFakeBridge());
}

function registerGuardedKind(beforeClose?: (tabId: string) => Promise<boolean>): void {
    UNREGISTER.push(
        declareTabKindSpec({
            beforeClose,
            closable: true,
            icon: 'connection',
            id: 'guarded',
            title: () => 'Guarded',
        }),
    );
}

function tabIds(api: ShellStoreApi): string[] {
    return leavesOf(api.getState().grid).flatMap((leaf) => leaf.tabs.map((tab) => tab.id));
}

function open(api: ShellStoreApi, groupId: string, id: string): void {
    api.getState().openTab(groupId, { id, kind: 'guarded', resource: `mandor://r/w/doc/${id}` });
}

afterEach(() => {
    for (const unregister of UNREGISTER.splice(0)) {
        unregister();
    }
});

describe('asking a tab before it leaves (close-requests)', () => {
    it('closes at once a tab whose kind asks for nothing', async () => {
        const api = store();

        registerGuardedKind();
        open(api, ROOT_GROUP_ID, 'one');

        const answer = api.getState().requestCloseTab(ROOT_GROUP_ID, 'one');

        expect(tabIds(api)).toEqual([]);
        await expect(answer).resolves.toBe(true);
    });

    it('closes the tab once its kind says it may go', async () => {
        const beforeClose = vi.fn().mockResolvedValue(true);
        const api = store();

        registerGuardedKind(beforeClose);
        open(api, ROOT_GROUP_ID, 'one');

        await expect(api.getState().requestCloseTab(ROOT_GROUP_ID, 'one')).resolves.toBe(true);

        expect(beforeClose).toHaveBeenCalledWith('one');
        expect(tabIds(api)).toEqual([]);
    });

    it('keeps the tab open when its kind says no', async () => {
        const api = store();

        registerGuardedKind(vi.fn().mockResolvedValue(false));
        open(api, ROOT_GROUP_ID, 'one');

        await expect(api.getState().requestCloseTab(ROOT_GROUP_ID, 'one')).resolves.toBe(false);

        expect(tabIds(api)).toEqual(['one']);
    });

    it('asks nothing about a tab that is not there', async () => {
        const beforeClose = vi.fn().mockResolvedValue(true);
        const api = store();

        registerGuardedKind(beforeClose);

        await expect(api.getState().requestCloseTab(ROOT_GROUP_ID, 'ghost')).resolves.toBe(true);

        expect(beforeClose).not.toHaveBeenCalled();
    });

    it('asks the tabs of a group one by one, closing each yes, and stops at the first no', async () => {
        const beforeClose = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
        const api = store();

        registerGuardedKind(beforeClose);

        const beside = api.getState().splitGroup(ROOT_GROUP_ID, 'row');

        open(api, beside, 'one');
        open(api, beside, 'two');
        open(api, beside, 'three');

        await expect(api.getState().requestCloseGroup(beside)).resolves.toBe(false);

        expect(beforeClose).toHaveBeenCalledTimes(2);
        expect(tabIds(api)).toEqual(['two', 'three']);
    });

    it('closes the group when every tab agrees', async () => {
        const api = store();

        registerGuardedKind(vi.fn().mockResolvedValue(true));

        const beside = api.getState().splitGroup(ROOT_GROUP_ID, 'row');

        open(api, beside, 'one');

        await expect(api.getState().requestCloseGroup(beside)).resolves.toBe(true);

        expect(leavesOf(api.getState().grid)).toHaveLength(1);
    });

    it('closes at once a group none of whose tabs asks for anything', async () => {
        const api = store();
        const beside = api.getState().splitGroup(ROOT_GROUP_ID, 'row');

        const answer = api.getState().requestCloseGroup(beside);

        expect(leavesOf(api.getState().grid)).toHaveLength(1);
        await expect(answer).resolves.toBe(true);
    });
});

describe('asking several tabs at once (close-requests)', () => {
    it('closes all of them once every kind agrees', async () => {
        const api = store();

        registerGuardedKind(vi.fn().mockResolvedValue(true));
        open(api, ROOT_GROUP_ID, 'one');
        open(api, ROOT_GROUP_ID, 'two');
        open(api, ROOT_GROUP_ID, 'three');

        await expect(
            api.getState().requestCloseTabs(ROOT_GROUP_ID, ['one', 'three']),
        ).resolves.toBe(true);

        expect(tabIds(api)).toEqual(['two']);
    });

    it('closes the ones that agreed before a no, and keeps the rest', async () => {
        const api = store();

        registerGuardedKind(vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false));
        open(api, ROOT_GROUP_ID, 'one');
        open(api, ROOT_GROUP_ID, 'two');
        open(api, ROOT_GROUP_ID, 'three');

        await expect(
            api.getState().requestCloseTabs(ROOT_GROUP_ID, ['one', 'two', 'three']),
        ).resolves.toBe(false);

        expect(tabIds(api)).toEqual(['two', 'three']);
    });
});
