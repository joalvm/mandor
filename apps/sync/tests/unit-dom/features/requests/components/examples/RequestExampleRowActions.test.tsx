import { exampleResource, itemResource } from '@mandor/collections';
import { success } from '@mandor/ipc';
import { REQUEST_ITEM_KIND, type CollectionNode } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestExampleRowActions } from '../../../../../../src/renderer/features/requests/components/examples/RequestExampleRowActions.js';
import { requestsStore } from '../../../../../../src/renderer/features/requests/requests-store.js';
import { httpResponseWith } from '../../../../support/http-response.js';
import { openRowMenu } from '../../../../support/row-menu.js';

const ITEM = itemResource('Local', 'local', 'crear-pedido');

const REQUEST_NODE: CollectionNode = {
    itemKind: REQUEST_ITEM_KIND,
    kind: 'item',
    name: 'crear pedido',
    path: 'crear-pedido',
    tags: [],
};
const MESSAGE_NODE: CollectionNode = { ...REQUEST_NODE, itemKind: 'message' };

const FILE = {
    examples: [],
    kind: REQUEST_ITEM_KIND,
    method: 'GET',
    name: 'crear pedido',
    url: '',
};

function menuOf(node: CollectionNode): void {
    openRowMenu({ node, workspaceId: 'local' }, <RequestExampleRowActions />);
}

describe('the lines of a request about its examples', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        requestsStore.getState().reset();
        shellStore.getState().reset();
        shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
        shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'local' });
        vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(success(FILE));
    });

    afterEach(() => {
        cleanup();
        requestsStore.getState().reset();
        shellStore.getState().reset();
    });

    it('offers a new example, and no response to keep before the request has sent', async () => {
        menuOf(REQUEST_NODE);

        expect(await screen.findByRole('menuitem', { name: 'New example' })).toBeVisible();
        expect(screen.queryByRole('menuitem', { name: 'Save response as example' })).toBeNull();
    });

    it('makes the example when the line is chosen', async () => {
        const writeItem = vi
            .spyOn(window.mandor.collections, 'writeItem')
            .mockResolvedValue(success({}));

        menuOf(REQUEST_NODE);
        fireEvent.click(await screen.findByRole('menuitem', { name: 'New example' }));

        await waitFor(() => {
            expect(writeItem).toHaveBeenCalledOnce();
        });
        expect(
            shellStore.getState().resources[
                exampleResource('Local', 'local', 'crear-pedido', 'New example')
            ]?.tabs,
        ).toHaveLength(1);
    });

    it('offers to keep the response once the request has one', async () => {
        const writeItem = vi
            .spyOn(window.mandor.collections, 'writeItem')
            .mockResolvedValue(success({}));

        requestsStore.getState().beginSend(ITEM, 's1');
        requestsStore
            .getState()
            .finishSend(ITEM, 's1', { response: httpResponseWith(), state: 'done' });
        menuOf(REQUEST_NODE);
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Save response as example' }));

        await waitFor(() => {
            expect(writeItem).toHaveBeenCalledOnce();
        });
    });

    it('draws nothing in the menu of another kind of item', () => {
        menuOf(MESSAGE_NODE);

        expect(screen.queryByRole('menuitem', { name: 'New example' })).toBeNull();
    });
});
