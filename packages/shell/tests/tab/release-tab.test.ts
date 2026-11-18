import { createFakeBridge } from '@mandor/ipc/testing';
import { ROOT_GROUP_ID } from '@mandor/ipc';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createShellStore, type ShellStoreApi } from '../../src/shell-store.js';
import { declareTabKindSpec } from '../../src/testing/tab-kind.js';

const ALPHA = 'mandor://demo/payments/connection/alpha';
const BETA = 'mandor://demo/payments/connection/beta';

const UNREGISTER: (() => void)[] = [];

function store(): ShellStoreApi {
    return createShellStore(createFakeBridge());
}

function registerLiveKind(release: (tabId: string, resource: string) => void): void {
    UNREGISTER.push(
        declareTabKindSpec({
            closable: true,
            icon: 'connection',
            id: 'live',
            release,
            title: () => 'Alpha',
        }),
    );
}

afterEach(() => {
    for (const unregister of UNREGISTER.splice(0)) {
        unregister();
    }
});

describe('closing a tab of a kind that holds something open', () => {
    /**
     * What the tab held lives outside the window; nothing else would tell it the view is gone.
     * The resource goes with the id, because what the tab was holding is filed under it.
     */
    it('tells the kind to let go of what the tab was holding', () => {
        const release = vi.fn();
        const api = store();

        registerLiveKind(release);
        api.getState().openTab(ROOT_GROUP_ID, { id: 'alpha', kind: 'live', resource: ALPHA });
        api.getState().closeTab(ROOT_GROUP_ID, 'alpha');

        expect(release).toHaveBeenCalledWith('alpha', ALPHA);
    });

    /** Two views of one thing hold it once: the first to close cannot take it from the second. */
    it('waits for the last view of the resource before letting go of it', () => {
        const release = vi.fn();
        const api = store();

        registerLiveKind(release);

        const beside = api.getState().splitGroup(ROOT_GROUP_ID, 'row');

        api.getState().openTab(ROOT_GROUP_ID, { id: 'alpha', kind: 'live', resource: ALPHA });
        api.getState().openTab(beside, { id: 'alpha#2', kind: 'live', resource: ALPHA });
        api.getState().closeTab(beside, 'alpha#2');

        expect(release).not.toHaveBeenCalled();

        api.getState().closeTab(ROOT_GROUP_ID, 'alpha');

        expect(release).toHaveBeenCalledWith('alpha', ALPHA);
    });

    it('leaves the tabs that stay holding what they had', () => {
        const release = vi.fn();
        const api = store();

        registerLiveKind(release);
        api.getState().openTab(ROOT_GROUP_ID, { id: 'alpha', kind: 'live', resource: ALPHA });
        api.getState().openTab(ROOT_GROUP_ID, { id: 'beta', kind: 'live', resource: BETA });
        api.getState().closeTab(ROOT_GROUP_ID, 'beta');

        expect(release).toHaveBeenCalledTimes(1);
        expect(release).toHaveBeenCalledWith('beta', BETA);
    });
});
