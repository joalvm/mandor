import { ItemTab, collectionStore, itemResource } from '@mandor/collections';
import { success } from '@mandor/ipc';
import { REQUEST_ITEM_KIND } from '@mandor/schema';
import { originName, shellStore, TabProvider } from '@mandor/shell';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    RequestItemKind,
    requestsStore,
} from '../../../../src/renderer/features/requests/index.js';
import { AppProviders } from '../../support/app-providers.js';
import { flush } from '../../support/flush.js';

let resource = '';
let unregisterRequest: () => void = () => undefined;

/** The write the bridge hears, as the caller built it. */
type WriteCall = { fields?: Record<string, unknown> };

const NODE = {
    itemKind: REQUEST_ITEM_KIND,
    kind: 'item' as const,
    name: 'crear pedido',
    path: 'crear-pedido',
    tags: [],
};

beforeEach(() => {
    vi.restoreAllMocks();
    collectionStore.getState().reset();
    collectionStore.getState().setNodes([NODE]);
    requestsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'local' });
    resource = itemResource(originName(), 'local', 'crear-pedido');
    unregisterRequest = render(<RequestItemKind />, { wrapper: AppProviders }).unmount;
    vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(
        success({
            kind: REQUEST_ITEM_KIND,
            method: 'GET',
            name: 'crear pedido',
            url: '{{baseUrl}}/pedidos',
        }),
    );
});

afterEach(() => {
    cleanup();
    unregisterRequest();
    collectionStore.getState().reset();
    requestsStore.getState().reset();
    shellStore.getState().reset();
});

/** The tab of the request with the method turned to POST: a draft nobody saved yet. */
async function drawWithPostDraft() {
    const writeItem = vi
        .spyOn(window.mandor.collections, 'writeItem')
        .mockResolvedValue(success({}));

    render(
        <TabProvider value={{ resource: resource, tabId: resource }}>
            <ItemTab />
        </TabProvider>,
        { wrapper: AppProviders },
    );
    await flush();

    // Radix opens the menu on pointerdown of its trigger, and runs the line on click.
    fireEvent.pointerDown(screen.getByRole('button', { name: /^Method / }), {
        button: 0,
        ctrlKey: false,
    });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'POST' }));
    await flush();

    return writeItem;
}

describe('the tab of a request', () => {
    it('paints the method and the URL the request carries', async () => {
        render(
            <TabProvider value={{ resource: resource, tabId: resource }}>
                <ItemTab />
            </TabProvider>,
            { wrapper: AppProviders },
        );
        await flush();

        expect(screen.getByRole('button', { name: /^Method / })).toHaveTextContent('GET');
        expect(screen.getByRole('textbox', { name: 'URL' })).toHaveTextContent(
            '{{baseUrl}}/pedidos',
        );
    });

    it('what the bar edits reaches the YAML when the draft is saved, kind named', async () => {
        const writeItem = await drawWithPostDraft();

        fireEvent.keyDown(screen.getByRole('group', { name: 'Request' }), {
            ctrlKey: true,
            key: 's',
        });
        await waitFor(() => {
            expect(writeItem).toHaveBeenCalledOnce();
        });

        const write = writeItem.mock.calls[0]?.[0] as WriteCall | undefined;

        expect(write).toMatchObject({ path: 'crear-pedido', workspaceId: 'local' });
        expect(write?.fields).toMatchObject({ kind: REQUEST_ITEM_KIND, method: 'POST' });
    });

    /** A field that keeps its keys from what holds it still lets the panel hear Ctrl+S. */
    it('saves with Ctrl+S typed in the field of the url', async () => {
        const writeItem = await drawWithPostDraft();

        fireEvent.keyDown(screen.getByRole('textbox', { name: 'URL' }), {
            ctrlKey: true,
            key: 's',
        });

        await waitFor(() => {
            expect(writeItem).toHaveBeenCalledOnce();
        });
    });
});
