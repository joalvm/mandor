import { EMPTY_UI_SESSION, ROOT_GROUP_ID, success, type UiSession } from '@mandor/ipc';
import { createFakeBridge } from '@mandor/ipc/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { createShellStore } from '../../src/shell-store.js';
import { declareTabKindSpec } from '../../src/testing/tab-kind.js';

const ORIGIN = 'local';
const ONE = 'mandor://demo/payments/doc/one.md';
const ENVIRONMENT = 'mandor://demo/payments/environment/local';

const SPLIT = 'second';

const SESSION: UiSession = {
    ...EMPTY_UI_SESSION,
    activeWorkspaceId: 'payments',
    grid: {
        kind: 'leaf',
        id: ROOT_GROUP_ID,
        tabs: [
            { id: 'one', kind: 'doc', resource: ONE },
            { id: 'environment-payments-local', kind: 'environment', resource: ENVIRONMENT },
        ],
        activeTab: 'environment-payments-local',
    },
};

const SPLIT_SESSION: UiSession = {
    ...SESSION,
    activeGroupId: SPLIT,
    grid: {
        kind: 'branch',
        axis: 'row',
        sizes: [50, 50],
        children: [
            {
                kind: 'leaf',
                id: ROOT_GROUP_ID,
                tabs: [{ id: 'one', kind: 'doc', resource: ONE }],
                activeTab: 'one',
            },
            {
                kind: 'leaf',
                id: SPLIT,
                tabs: [
                    {
                        id: 'environment-payments-local',
                        kind: 'environment',
                        resource: ENVIRONMENT,
                    },
                ],
                activeTab: 'environment-payments-local',
            },
        ],
    },
};

let unregister = (): void => undefined;

afterEach(() => {
    unregister();
});

function storeOnSession(session: UiSession): ReturnType<typeof createShellStore> {
    return createShellStore(
        createFakeBridge({ session: { load: () => Promise.resolve(success(session)) } }),
    );
}

function drawsDocs(): () => void {
    return declareTabKindSpec({
        closable: true,
        icon: 'doc',
        id: 'doc',
        title: () => 'One',
    });
}

describe('a session written by a build that had one tab kind more', () => {
    it('drops the tab whose kind nobody draws any more and keeps the rest', async () => {
        unregister = drawsDocs();

        const api = storeOnSession(SESSION);

        await api.getState().loadSession(ORIGIN);

        const grid = api.getState().grid;

        expect(grid).toEqual({
            kind: 'leaf',
            id: ROOT_GROUP_ID,
            tabs: [{ id: 'one', kind: 'doc', resource: ONE }],
            activeTab: 'one',
        });
        expect(api.getState().resources).toEqual({ [ONE]: { missing: false, tabs: ['one'] } });
    });

    it('closes the split that held nothing else and moves the focus to what is left', async () => {
        unregister = drawsDocs();

        const api = storeOnSession(SPLIT_SESSION);

        await api.getState().loadSession(ORIGIN);

        expect(api.getState().grid).toEqual({
            kind: 'leaf',
            id: ROOT_GROUP_ID,
            tabs: [{ id: 'one', kind: 'doc', resource: ONE }],
            activeTab: 'one',
        });
        expect(api.getState().activeGroupId).toBe(ROOT_GROUP_ID);
    });
});
