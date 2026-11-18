import type { CollectionItemNode } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { openExampleRow } from '../../src/lib/open-example-row.js';

import { declareItemKind } from '../support/declare-item-kind.js';

const LOGIN: CollectionItemNode = {
    kind: 'item',
    itemKind: 'request',
    name: 'Login',
    path: 'acceso/login',
    examples: [{ key: 'Creado', name: 'Creado', mark: '201' }],
    tags: [],
};

let unregister: () => void = () => undefined;

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
});

afterEach(() => {
    unregister();
    shellStore.getState().reset();
});

describe('opening the line of an example', () => {
    it('hands the resource of the example to what its kind declared, with how to open it', () => {
        const open = vi.fn();

        unregister = declareItemKind({
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

        openExampleRow(
            'events',
            LOGIN,
            { key: 'Creado', name: 'Creado' },
            {
                beside: false,
                preview: true,
            },
        );

        expect(open).toHaveBeenCalledWith(
            'mandor://local-apis/events/example/acceso/login/Creado',
            {
                beside: false,
                preview: true,
            },
        );
    });

    it('does nothing when the kind of the item declared no examples', () => {
        unregister = declareItemKind({ id: 'request', component: () => null, newLabel: 'x' });

        expect(() => {
            openExampleRow(
                'events',
                LOGIN,
                { key: 'Creado', name: 'Creado' },
                {
                    beside: true,
                    preview: false,
                },
            );
        }).not.toThrow();
    });
});
