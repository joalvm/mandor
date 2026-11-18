import { ROOT_GROUP_ID } from '@mandor/ipc';
import { selectOpenResources, shellStore } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { blankItemTabs } from '../../src/lib/blank-item-tabs.js';
import { moveItemTabs } from '../../src/lib/move-item-tabs.js';

import { EXAMPLE_CREADO, WITH_EXAMPLES } from '../support/login-with-examples.js';

const LOGIN = 'mandor://local-apis/events/item/acceso/login';
const [acceso] = WITH_EXAMPLES;
const NODE = acceso?.kind === 'collection' ? acceso.children[0] : undefined;

function openBoth(): void {
    const { openTab } = shellStore.getState();

    openTab(ROOT_GROUP_ID, { id: 'item', kind: 'item', resource: LOGIN });
    openTab(ROOT_GROUP_ID, { id: 'example', kind: 'example', resource: EXAMPLE_CREADO });
}

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
});

afterEach(() => {
    shellStore.getState().reset();
});

describe('the tabs of the examples of an item that moved or left', () => {
    it('go with the item to where it now is', () => {
        openBoth();

        if (NODE !== undefined) {
            moveItemTabs('events', NODE, 'acceso/entrar');
        }

        expect(selectOpenResources(shellStore.getState())).toEqual([
            'mandor://local-apis/events/item/acceso/entrar',
            'mandor://local-apis/events/example/acceso/entrar/Creado',
        ]);
    });

    it('stay open, pointing at nothing, when the item is deleted', () => {
        openBoth();

        if (NODE !== undefined) {
            blankItemTabs('events', NODE);
        }

        const { resources } = shellStore.getState();

        expect(resources[LOGIN]?.missing).toBe(true);
        expect(resources[EXAMPLE_CREADO]?.missing).toBe(true);
    });

    it('are not reached through the tabs of an item whose name merely starts the same way', () => {
        shellStore.getState().openTab(ROOT_GROUP_ID, {
            id: 'other',
            kind: 'example',
            resource: 'mandor://local-apis/events/example/acceso/login-2/Creado',
        });

        if (NODE !== undefined) {
            blankItemTabs('events', NODE);
        }

        expect(
            shellStore.getState().resources[
                'mandor://local-apis/events/example/acceso/login-2/Creado'
            ]?.missing,
        ).toBe(false);
    });
});
