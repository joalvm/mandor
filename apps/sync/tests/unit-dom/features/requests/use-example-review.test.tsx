import { exampleResource, itemResource } from '@mandor/collections';
import { failure, success } from '@mandor/ipc';
import { parseCollectionItem, parseRequestItem } from '@mandor/schema';
import { act, cleanup, renderHook, screen, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { useExampleReview } from '../../../../src/renderer/features/requests/hooks/useExampleReview.js';
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

/** The example as the file holds it: the order of its keys is the schema's, not the test's. */
const SAVED = REQUEST.examples[0] ?? EXAMPLE;

const DONE = {
    response: httpResponseWith({ body: textBody('{"id":2}'), status: 200 }),
    state: 'done',
} as const;

function review(entry: Parameters<typeof useExampleReview>[2]) {
    return renderHook(() => useExampleReview(RESOURCE, SAVED, entry), {
        wrapper: ({ children }: PropsWithChildren) => <AppProviders>{children}</AppProviders>,
    }).result;
}

function draft() {
    return requestsStore.getState().exampleDrafts[RESOURCE];
}

describe('what a person does with the differences of an example (useExampleReview)', () => {
    beforeEach(() => {
        requestsStore.getState().reset();
        requestsStore.getState().setRequest(ITEM, REQUEST);
    });

    afterEach(() => {
        // The hook goes first: resetting a store under a mounted hook is an update outside act.
        cleanup();
        vi.restoreAllMocks();
        requestsStore.getState().reset();
    });

    it('takes the answer received as what the example expects, keeping its name', async () => {
        const result = review(DONE);

        act(() => {
            result.current.accept();
        });

        await waitFor(() => {
            expect(draft()?.example).toMatchObject({
                body: '{"id":2}',
                name: 'Creado',
                status: '200',
            });
        });
    });

    it('takes the answer as main gave it back, with its secrets hidden', async () => {
        vi.spyOn(syncBridge.request, 'hideSecrets').mockResolvedValue(
            success(httpResponseWith({ body: textBody('[redacted]'), status: 200 })),
        );

        const result = review(DONE);

        act(() => {
            result.current.accept();
        });

        await waitFor(() => {
            expect(draft()?.example).toMatchObject({ body: '[redacted]' });
        });
    });

    it('leaves the example as it was when main does not hide the answer', async () => {
        const hide = vi
            .spyOn(syncBridge.request, 'hideSecrets')
            .mockResolvedValue(failure('bad-request', 'no'));
        const result = review(DONE);

        await act(async () => {
            result.current.accept();
            await hide.mock.results[0]?.value;
        });

        expect(hide).toHaveBeenCalledOnce();
        expect(draft()).toBeUndefined();
    });

    it('takes nothing while no answer came', () => {
        const result = review({ state: 'idle' });

        act(() => {
            result.current.accept();
        });

        expect(draft()).toBeUndefined();
    });

    it('tells a person which value the schema still refuses once the answer is taken', async () => {
        const onSchemaLeft = vi.fn();
        const schema = '{"type":"object","properties":{"id":{"type":"string"}}}';
        const result = renderHook(
            () => useExampleReview(RESOURCE, SAVED, DONE, { onSchemaLeft, schema }),
            {
                wrapper: ({ children }: PropsWithChildren) => (
                    <AppProviders>{children}</AppProviders>
                ),
            },
        ).result;

        act(() => {
            result.current.accept();
        });

        expect(await screen.findByText('Values accepted')).toBeInTheDocument();
        expect(onSchemaLeft).toHaveBeenCalledOnce();
        expect(
            screen.getByText(/^The schema still refuses id: must be string; it is /u),
        ).toBeInTheDocument();
    });
});
