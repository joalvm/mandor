import { createFakeBridge } from '@mandor/ipc/testing';
import { EMPTY_UI_SESSION, ROOT_GROUP_ID, success, type UiSession } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { saveOnClose, selectSection } from '../../src/index.js';
import { createShellStore } from '../../src/shell-store.js';
import { declareTabKindSpec } from '../../src/testing/tab-kind.js';

const ORIGIN = 'local';
const OPEN = 'mandor://demo/events/item/pedido-creado';
const CLOSED = 'mandor://demo/events/item/pedido-cancelado';

const SESSION: UiSession = {
    version: 2,
    activeWorkspaceId: null,
    activeGroupId: ROOT_GROUP_ID,
    grid: {
        kind: 'leaf',
        id: ROOT_GROUP_ID,
        tabs: [{ id: 'alpha', kind: 'item', resource: OPEN }],
        activeTab: 'alpha',
    },
    panels: { ...EMPTY_UI_SESSION.panels },
    sections: { [OPEN]: 'description', [CLOSED]: 'schema' },
};

describe('the section each open resource was left on', () => {
    it('travels to the session the window writes when it goes away', () => {
        const written: { session: UiSession }[] = [];
        const store = createShellStore(
            createFakeBridge({
                session: {
                    save: (input: { session: UiSession }) => {
                        written.push(input);

                        return Promise.resolve(success({}));
                    },
                },
            }),
        );

        store.setState({ activeOriginId: ORIGIN });

        const stop = saveOnClose(store);

        store.getState().setSection(OPEN, 'description');
        window.dispatchEvent(new Event('pagehide'));

        expect(written[0]?.session.sections).toEqual({ [OPEN]: 'description' });

        stop();
    });

    it('comes back when the origin opens, only for the resources still open', async () => {
        const unregister = declareTabKindSpec({
            closable: true,
            icon: 'doc',
            id: 'item',
            title: () => 'Pedido creado',
        });
        const store = createShellStore(
            createFakeBridge({ session: { load: () => Promise.resolve(success(SESSION)) } }),
        );

        await store.getState().loadSession(ORIGIN);

        expect(selectSection(store.getState(), OPEN)).toBe('description');
        expect(selectSection(store.getState(), CLOSED)).toBeNull();

        unregister();
    });
});
