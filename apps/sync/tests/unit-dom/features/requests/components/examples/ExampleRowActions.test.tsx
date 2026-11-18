import { itemResource } from '@mandor/collections';
import { REQUEST_ITEM_KIND, type CollectionNode, type RequestItem } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ExampleRowActions } from '../../../../../../src/renderer/features/requests/components/examples/ExampleRowActions.js';
import { requestsStore } from '../../../../../../src/renderer/features/requests/requests-store.js';
import { openRowMenu } from '../../../../support/row-menu.js';

const ITEM = itemResource('Local', 'local', 'crear-pedido');

const NODE: CollectionNode = {
    itemKind: REQUEST_ITEM_KIND,
    kind: 'item',
    name: 'crear pedido',
    path: 'crear-pedido',
    tags: [],
};

const REQUEST: RequestItem = {
    body: { type: 'none' },
    examples: [{ body: '{}', contentType: 'application/json', name: 'Creado', status: '201' }],
    headers: [],
    method: 'POST',
    name: 'crear pedido',
    pathParams: [],
    query: [],
    settings: { followRedirects: true, maxRedirects: 5, timeoutMs: 30000, validateTls: true },
    url: '/pedidos',
};

describe('the line of an example that opens it as a request', () => {
    beforeEach(() => {
        requestsStore.getState().reset();
        shellStore.getState().reset();
        shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
        shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'local' });
        requestsStore.getState().beginRead(ITEM);
        requestsStore.getState().finishRead(ITEM, REQUEST);
    });

    afterEach(() => {
        cleanup();
        requestsStore.getState().reset();
        shellStore.getState().reset();
    });

    it('opens the example as a request of its own when it is chosen', async () => {
        openRowMenu(
            {
                example: { key: 'Creado', name: 'Creado' },
                node: NODE,
                workspaceId: 'local',
            },
            <ExampleRowActions />,
        );
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Open as request' }));

        const opened = Object.entries(requestsStore.getState().requests).filter(([resource]) =>
            resource.includes('/loose/'),
        );

        expect(opened.map(([, request]) => request.name)).toEqual(['crear pedido — Creado']);
    });

    it('draws nothing in the menu of a row that is no example', () => {
        openRowMenu({ node: NODE, workspaceId: 'local' }, <ExampleRowActions />);

        expect(screen.queryByRole('menuitem', { name: 'Open as request' })).toBeNull();
    });
});
