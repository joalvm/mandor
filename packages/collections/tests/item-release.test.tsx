import { SendIcon } from '@mandor/icons';
import { tabKind } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { collectionStore, ItemTabKind } from '../src/index.js';
import { ITEM_TAB_KIND } from '../src/item-tab-kind.js';

import { TWO_FOLDERS } from './support/two-folders.js';
import { declareItemKind } from './support/declare-item-kind.js';

const PEDIDO = 'mandor://local-apis/events/item/pedidos/pedido-creado';
const FUERA = 'mandor://local-apis/events/item/fuera/de-collectiono';

let undo: (() => void)[] = [];

function leaf(release?: (resource: string) => void) {
    return {
        component: SendIcon,
        newLabel: 'collections:newItem',
        ...(release === undefined ? {} : { release }),
    };
}

beforeEach(() => {
    collectionStore.getState().reset();
    collectionStore.getState().setNodes(TWO_FOLDERS);
    undo = [render(<ItemTabKind />).unmount];
});

afterEach(() => {
    for (const step of undo) {
        step();
    }
});

describe('the last view of an item leaving', () => {
    it('tells the leaf of the kind of that item, and no other', () => {
        const message = vi.fn();
        const request = vi.fn();

        undo.push(declareItemKind({ id: 'message', ...leaf(message) }));
        undo.push(declareItemKind({ id: 'request', ...leaf(request) }));

        tabKind(ITEM_TAB_KIND)?.release?.('tab-1', PEDIDO);

        expect(message).toHaveBeenCalledWith(PEDIDO);
        expect(request).not.toHaveBeenCalled();
    });

    it('goes quietly when the leaf has nothing to let go of, or the item is no longer in the tree', () => {
        const message = vi.fn();

        undo.push(declareItemKind({ id: 'message', ...leaf() }));

        expect(() => tabKind(ITEM_TAB_KIND)?.release?.('tab-1', PEDIDO)).not.toThrow();

        undo.push(declareItemKind({ id: 'message', ...leaf(message) }));
        tabKind(ITEM_TAB_KIND)?.release?.('tab-2', FUERA);

        expect(message).not.toHaveBeenCalled();
    });
});
