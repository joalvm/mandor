import { SendIcon } from '@mandor/icons';
import type { CollectionNode } from '@mandor/schema';
import { vi } from 'vitest';

import type { ItemExamplesLogic } from '../../src/item-leaf-registry.js';
import { declareItemKind } from './declare-item-kind.js';

/** A request with two examples, as the tree reads it from the file of a request. */
export const WITH_EXAMPLES: CollectionNode[] = [
    {
        kind: 'collection',
        name: 'Acceso',
        path: 'acceso',
        children: [
            {
                kind: 'item',
                itemKind: 'request',
                name: 'Login',
                path: 'acceso/login',
                mark: 'POST',
                examples: [
                    { key: 'Creado', name: 'Creado', mark: '201' },
                    { key: 'Roto', name: 'Roto', mark: '500' },
                ],
                tags: [],
            },
        ],
    },
];

export const EXAMPLE_CREADO = 'mandor://local-apis/events/example/acceso/login/Creado';
export const EXAMPLE_ROTO = 'mandor://local-apis/events/example/acceso/login/Roto';

/** The spies an app would implement; the tree only ever calls them. */
export function exampleSpies() {
    return {
        open: vi.fn<ItemExamplesLogic['open']>(),
        move: vi.fn<ItemExamplesLogic['move']>(() => Promise.resolve()),
        rename: vi.fn<ItemExamplesLogic['rename']>(() => Promise.resolve()),
        duplicate: vi.fn<ItemExamplesLogic['duplicate']>(() => Promise.resolve()),
        remove: vi.fn<ItemExamplesLogic['remove']>(() => Promise.resolve()),
    };
}

/** Declares the kind `request` with examples the spies answer for. Returns the way to undo it. */
export function declareRequestWithExamples(examples: ItemExamplesLogic | undefined): () => void {
    return declareItemKind({
        component: SendIcon,
        examples,
        id: 'request',
        newLabel: 'collections:newItem',
    });
}
