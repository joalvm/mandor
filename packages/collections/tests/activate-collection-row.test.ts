import { selectTabs, shellStore } from '@mandor/shell';
import type { CollectionNode } from '@mandor/schema';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { collectionStore } from '../src/collection-store.js';
import { activateCollectionRow } from '../src/lib/activate-collection-row.js';
import { collectionRows } from '../src/lib/collection-rows.js';

import { declareItemKind } from './support/declare-item-kind.js';
import { TWO_FOLDERS } from './support/two-folders.js';

const LOOK = { altKey: false, ctrlKey: false, keep: false, metaKey: false, shiftKey: false };

function rows(folded: readonly string[]) {
    return collectionRows(TWO_FOLDERS, folded, []);
}

afterEach(() => {
    collectionStore.getState().reset();
    shellStore.getState().reset();
});

describe('a plain press on a line of the collection', () => {
    it('folds an open folder, and opens a folded one', () => {
        activateCollectionRow('events', rows([]), 'pedidos', LOOK);

        expect(collectionStore.getState().folded['events']).toEqual(['pedidos']);

        activateCollectionRow('events', rows(['pedidos']), 'pedidos', LOOK);

        expect(collectionStore.getState().folded['events']).toEqual([]);
    });

    it('looks at an item in the tab kept for a look, and keeps it when asked to', () => {
        activateCollectionRow('events', rows([]), 'pedidos/pedido-creado', LOOK);

        expect(selectTabs(shellStore.getState()).map((tab) => tab.preview)).toEqual([true]);

        activateCollectionRow('events', rows([]), 'pedidos/pedido-creado', { ...LOOK, keep: true });

        expect(selectTabs(shellStore.getState()).map((tab) => tab.preview)).toEqual([undefined]);
    });

    it('does nothing for a line that is not a node', () => {
        activateCollectionRow('events', rows([]), 'nowhere', LOOK);

        expect([collectionStore.getState().folded, selectTabs(shellStore.getState())]).toEqual([
            {},
            [],
        ]);
    });

    it('asks the kind of the item to open an example, kept only when asked to keep it', () => {
        const open = vi.fn();
        const unregister = declareItemKind({
            id: 'request',
            component: () => null,
            newLabel: 'x',
            examples: {
                open,
                move: () => Promise.resolve(),
                rename: () => Promise.resolve(),
                duplicate: () => Promise.resolve(),
                remove: () => Promise.resolve(),
            },
        });
        const tree: CollectionNode[] = [
            {
                kind: 'item',
                itemKind: 'request',
                name: 'Login',
                path: 'login',
                examples: [{ key: 'Creado', name: 'Creado' }],
                tags: [],
            },
        ];
        const lines = collectionRows(tree, [], []);

        shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
        shellStore.setState({ activeOriginId: 'local' });
        activateCollectionRow('events', lines, 'login:Creado', LOOK);
        activateCollectionRow('events', lines, 'login:Creado', { ...LOOK, keep: true });
        unregister();

        expect(open.mock.calls).toEqual([
            ['mandor://local-apis/events/example/login/Creado', { beside: false, preview: true }],
            ['mandor://local-apis/events/example/login/Creado', { beside: false, preview: false }],
        ]);
    });
});
