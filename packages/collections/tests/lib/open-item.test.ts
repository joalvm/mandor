import { originName, selectTabs, shellStore } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { itemResource } from '../../src/lib/item-resource.js';
import { openItem } from '../../src/lib/open-item.js';

const WORKSPACE = 'events';

function resourceOf(path: string): string {
    return itemResource(originName(), WORKSPACE, path);
}

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: WORKSPACE });
});

afterEach(() => {
    shellStore.getState().reset();
});

describe('opening an item', () => {
    it('opens the item once however many times it is asked for', () => {
        openItem(WORKSPACE, 'pedidos/cobrar');
        openItem(WORKSPACE, 'pedidos/cobrar');

        expect(selectTabs(shellStore.getState()).map((tab) => tab.resource)).toEqual([
            resourceOf('pedidos/cobrar'),
        ]);
    });

    /**
     * A move rewrites the resource of the tab and leaves the id it was born under, so the id the
     * opener derives from the new path finds nothing: the tab that already shows the item is the
     * one to show, not a second one of the same file.
     */
    it('shows the tab that already holds the item after the item moved under a new path', () => {
        openItem(WORKSPACE, 'pedidos/new-request');
        shellStore
            .getState()
            .moveResource(resourceOf('pedidos/new-request'), resourceOf('pedidos/crear-pedido'));
        openItem(WORKSPACE, 'pedidos/crear-pedido');

        expect(selectTabs(shellStore.getState()).map((tab) => tab.resource)).toEqual([
            resourceOf('pedidos/crear-pedido'),
        ]);
    });

    it('keeps two different items as two tabs', () => {
        openItem(WORKSPACE, 'pedidos/cobrar');
        openItem(WORKSPACE, 'pedidos/anular');

        expect(selectTabs(shellStore.getState())).toHaveLength(2);
    });
});
