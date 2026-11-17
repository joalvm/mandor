import { createFakeBridge } from '@mandor/ipc/testing';
import {
    EMPTY_UI_SESSION,
    ROOT_GROUP_ID,
    success,
    type UiSession,
    uiSessionSchema,
} from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import type { Tab } from '../../src/index.js';
import { createShellStore, type ShellStoreApi } from '../../src/shell-store.js';

const ORIGIN = 'local';
const ONE = 'mandor://demo/payments/doc/one.md';

function tab(id: string, resource: string): Tab {
    return { id, kind: 'doc', resource };
}

/**
 * A double that keeps what it was given and validates it on the way in, so a window closed down
 * to nothing is written the way main would have to accept it, and read back the same way.
 */
function roundTripStore(): { api: ShellStoreApi; saved: () => UiSession | null } {
    let session: UiSession | null = null;

    const api = createShellStore(
        createFakeBridge({
            session: {
                load: () => Promise.resolve(success(session ?? EMPTY_UI_SESSION)),
                save: (input) => {
                    session = uiSessionSchema.parse(input.session);

                    return Promise.resolve(success({}));
                },
            },
        }),
    );

    return { api, saved: () => session };
}

describe('a window that was closed down to nothing', () => {
    it('saves a session main would still accept, and draws it again empty', async () => {
        const { api, saved } = roundTripStore();

        await api.getState().loadSession(ORIGIN);

        const right = api.getState().splitGroup(ROOT_GROUP_ID, 'row');

        api.getState().openTab(ROOT_GROUP_ID, tab('one', ONE));
        api.getState().openTab(right, tab('one#2', ONE));
        api.getState().closeTab(right, 'one#2');
        api.getState().closeTab(ROOT_GROUP_ID, 'one');
        api.getState().saveSession();

        expect(saved()?.grid).toEqual({
            kind: 'leaf',
            id: ROOT_GROUP_ID,
            tabs: [],
            activeTab: null,
        });

        await expect(api.getState().loadSession(ORIGIN)).resolves.toMatchObject({ ok: true });
        expect(api.getState().resources).toEqual({});
    });
});
