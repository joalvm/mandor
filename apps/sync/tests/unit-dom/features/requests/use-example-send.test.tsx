import { exampleResource, itemResource } from '@mandor/collections';
import { success } from '@mandor/ipc';
import { parseCollectionItem, parseRequestItem } from '@mandor/schema';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { useExampleSend } from '../../../../src/renderer/features/requests/hooks/useExampleSend.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';
import { AppProviders } from '../../support/app-providers.js';
import { httpResponseWith, textBody } from '../../support/http-response.js';

const ITEM = itemResource('Local', 'local', 'crear-pedido');
const RESOURCE = exampleResource('Local', 'local', 'crear-pedido', 'Creado');

const EXAMPLE = {
    body: '{"id":1}',
    contentType: 'application/json',
    name: 'Creado',
    status: '201',
};

const REQUEST = parseRequestItem(
    parseCollectionItem({
        examples: [EXAMPLE],
        kind: 'request',
        method: 'POST',
        name: 'crear pedido',
        url: 'http://x/pedidos',
    }),
);

const VIEW = {
    example: EXAMPLE,
    item: ITEM,
    key: 'Creado',
    parent: REQUEST,
    saved: EXAMPLE,
};

function sender() {
    return renderHook(() => useExampleSend(RESOURCE, VIEW), {
        wrapper: ({ children }: PropsWithChildren) => <AppProviders>{children}</AppProviders>,
    }).result;
}

describe('sending an example from its tab (useExampleSend)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        requestsStore.getState().reset();
        requestsStore.getState().setRequest(ITEM, REQUEST);
    });

    afterEach(() => {
        // The hook goes first: resetting a store under a mounted hook is an update outside act.
        cleanup();
        requestsStore.getState().reset();
    });

    it('sends the example and sets the answer against it', async () => {
        const answer = httpResponseWith({ body: textBody('{"id":"2"}'), status: 201 });
        const send = vi.spyOn(syncBridge.request, 'send').mockResolvedValue(success(answer));
        const result = sender();

        act(() => {
            result.current.send();
        });

        await waitFor(() => {
            expect(result.current.entry.state).toBe('done');
        });

        expect(send).toHaveBeenCalledOnce();
        expect(result.current.comparison?.count).toBe(1);
        expect(result.current.sending).toBe(false);
    });

    it('cuts the send in flight', async () => {
        const cancel = vi.spyOn(syncBridge.request, 'cancel').mockResolvedValue(success({}));
        const result = sender();

        act(() => {
            requestsStore.setState({ sends: { [RESOURCE]: { sendId: 's1', state: 'sending' } } });
        });

        expect(result.current.sending).toBe(true);

        act(() => {
            result.current.cancel();
        });

        await waitFor(() => {
            expect(cancel).toHaveBeenCalledWith({ sendId: 's1' });
        });
    });
});
