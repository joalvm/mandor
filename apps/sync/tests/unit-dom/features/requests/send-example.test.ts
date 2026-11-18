import { exampleResource, itemResource } from '@mandor/collections';
import { envStore } from '@mandor/env';
import { success } from '@mandor/ipc';
import { DEFAULT_REQUEST_SETTINGS, parseCollectionItem, parseRequestItem } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import {
    exampleSendInputOf,
    sendExample,
} from '../../../../src/renderer/features/requests/lib/send-example.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';
import { httpResponseWith } from '../../support/http-response.js';

const ITEM = itemResource('Local', 'local', 'crear-pedido');
const RESOURCE = exampleResource('Local', 'local', 'crear-pedido', 'Creado');

const REQUEST = parseRequestItem(
    parseCollectionItem({
        examples: [
            {
                body: '{"id":1}',
                contentType: 'application/json',
                name: 'Creado',
                request: { query: [{ enabled: true, key: 'dryRun', value: 'true' }] },
                status: '201',
            },
        ],
        kind: 'request',
        method: 'POST',
        name: 'crear pedido',
        url: '{{baseUrl}}/pedidos',
    }),
);

describe('sending an example (send-example)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        requestsStore.getState().reset();
        envStore.getState().reset();
        requestsStore.getState().setRequest(ITEM, REQUEST);
    });

    afterEach(() => {
        requestsStore.getState().reset();
        envStore.getState().reset();
    });

    it('builds the input from the request the example hangs from, with the example over it', () => {
        envStore.setState({ activeEnvironmentIds: { local: 'env-1' } });

        const input = exampleSendInputOf(RESOURCE);

        expect(input?.environmentId).toBe('env-1');
        expect(input?.itemPath).toBe('crear-pedido');
        expect(input?.workspaceId).toBe('local');
        expect(input?.request.method).toBe('POST');
        expect(input?.request.query).toEqual([{ enabled: true, key: 'dryRun', value: 'true' }]);
        expect(input?.request.settings).toEqual(DEFAULT_REQUEST_SETTINGS);
    });

    it('sends what is typed in the example before what the file says', () => {
        requestsStore.getState().setExampleDraft(RESOURCE, {
            example: {
                body: '',
                contentType: 'application/json',
                name: 'Creado',
                request: { query: [{ enabled: true, key: 'typed', value: '1' }] },
                status: '201',
            },
        });

        expect(exampleSendInputOf(RESOURCE)?.request.query).toEqual([
            { enabled: true, key: 'typed', value: '1' },
        ]);
    });

    it('has no input for a request that was never read, nor for an example it lost', () => {
        requestsStore.getState().reset();

        expect(exampleSendInputOf(RESOURCE)).toBeNull();

        requestsStore.getState().setRequest(ITEM, { ...REQUEST, examples: [] });

        expect(exampleSendInputOf(RESOURCE)).toBeNull();
    });

    it('files the answer under the resource of the example, not under its request', async () => {
        const response = httpResponseWith({ status: 201 });
        const send = vi.spyOn(syncBridge.request, 'send').mockResolvedValue(success(response));

        await sendExample(RESOURCE);

        expect(send).toHaveBeenCalledTimes(1);
        expect(requestsStore.getState().sends[RESOURCE]).toEqual({
            query: [{ enabled: true, key: 'dryRun', value: 'true' }],
            response,
            sendId: send.mock.calls[0]?.[0].sendId,
            state: 'done',
        });
        expect(requestsStore.getState().sends[ITEM]).toBeUndefined();
    });
});
