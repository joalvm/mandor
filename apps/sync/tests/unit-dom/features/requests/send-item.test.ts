import { collectionStore, itemResource } from '@mandor/collections';
import { envStore } from '@mandor/env';
import { failure, success } from '@mandor/ipc';
import { DEFAULT_REQUEST_SETTINGS, parseCollectionItem, parseRequestItem } from '@mandor/schema';
import { createPendingWrites } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { cancelItem } from '../../../../src/renderer/features/requests/lib/cancel-item.js';
import { sendItem } from '../../../../src/renderer/features/requests/lib/send-item.js';
import { scriptOutputStore } from '../../../../src/renderer/features/requests/lib/script-output-store.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';

const RESOURCE = itemResource('Local', 'local', 'crear-pedido');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const REQUEST = parseRequestItem(
    parseCollectionItem({
        kind: 'request',
        method: 'POST',
        name: 'crear pedido',
        url: '{{baseUrl}}/pedidos',
    }),
);

const RESPONSE = {
    status: 201,
    statusText: 'Created',
    httpVersion: '2' as const,
    headers: [],
    body: null,
    sizes: { transferredBytes: 10, bodyBytes: 10, decoded: true },
    timings: { dnsMs: 1, connectMs: 1, tlsMs: 1, firstByteMs: 1, totalMs: 4, viaProxy: false },
    redirects: [],
    cookies: [],
};

describe('sending the item of a resource', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        requestsStore.getState().reset();
        envStore.getState().reset();
        requestsStore.getState().setRequest(RESOURCE, REQUEST);
    });

    afterEach(() => {
        requestsStore.getState().reset();
        envStore.getState().reset();
        collectionStore.getState().reset();
        scriptOutputStore.getState().reset();
    });

    it('sends the request as it stands on screen, over the defaults, with the environment of its workspace', async () => {
        envStore.setState({ activeEnvironmentIds: { local: 'env-1' } });
        const send = vi.spyOn(syncBridge.request, 'send').mockResolvedValue(success(RESPONSE));

        await sendItem(RESOURCE);

        expect(send).toHaveBeenCalledTimes(1);
        expect(send).toHaveBeenCalledWith({
            environmentId: 'env-1',
            itemPath: 'crear-pedido',
            request: { ...REQUEST, settings: DEFAULT_REQUEST_SETTINGS },
            sendId: expect.stringMatching(UUID) as string,
            workspaceId: 'local',
        });
    });

    it('goes out without an environment when the workspace has none active', async () => {
        const send = vi.spyOn(syncBridge.request, 'send').mockResolvedValue(success(RESPONSE));

        await sendItem(RESOURCE);

        expect(send.mock.calls[0]?.[0].environmentId).toBeNull();
    });

    it('is sending while the answer is on its way, under the id that can cut it', async () => {
        let answer: (value: ReturnType<typeof success<typeof RESPONSE>>) => void = () => undefined;

        const send = vi.spyOn(syncBridge.request, 'send').mockReturnValue(
            new Promise((resolve) => {
                answer = resolve;
            }),
        );
        const sending = sendItem(RESOURCE);

        expect(requestsStore.getState().sends[RESOURCE]?.state).toBe('sending');
        await vi.waitFor(() => {
            expect(send).toHaveBeenCalledTimes(1);
        });
        expect(requestsStore.getState().sends[RESOURCE]).toEqual({
            sendId: send.mock.calls[0]?.[0].sendId,
            state: 'sending',
        });

        answer(success(RESPONSE));
        await sending;
    });

    it('lets what was just typed reach the disk before main reads the variables', async () => {
        const order: string[] = [];
        const pending = createPendingWrites<string, string>(async () => {
            await Promise.resolve();
            order.push('written');
        });

        vi.spyOn(syncBridge.request, 'send').mockImplementation(() => {
            order.push('sent');

            return Promise.resolve(success(RESPONSE));
        });
        pending.schedule('dev', 'baseUrl');

        await sendItem(RESOURCE);

        expect(order).toEqual(['written', 'sent']);
    });

    /** What the scripts write is headed with the name the tree shows, not the one the draft read. */
    it('heads the console with the name the item has now, after a rename while open', async () => {
        const send = vi.spyOn(syncBridge.request, 'send').mockResolvedValue(success(RESPONSE));

        collectionStore.getState().setNodes([
            {
                kind: 'item',
                itemKind: 'request',
                mark: 'POST',
                name: 'pedido renombrado',
                path: 'crear-pedido',
                tags: [],
            },
        ]);

        await sendItem(RESOURCE);

        const sendId = send.mock.calls[0]?.[0].sendId ?? '';

        expect(scriptOutputStore.getState().places[sendId]?.title).toBe('POST pedido renombrado');
    });

    it('heads the console with the name of the draft while the tree holds no such item', async () => {
        const send = vi.spyOn(syncBridge.request, 'send').mockResolvedValue(success(RESPONSE));

        await sendItem(RESOURCE);

        const sendId = send.mock.calls[0]?.[0].sendId ?? '';

        expect(scriptOutputStore.getState().places[sendId]?.title).toBe('POST crear pedido');
    });

    it('keeps the response that came back', async () => {
        vi.spyOn(syncBridge.request, 'send').mockResolvedValue(success(RESPONSE));

        await sendItem(RESOURCE);

        expect(requestsStore.getState().sends[RESOURCE]).toEqual({
            query: [],
            response: RESPONSE,
            sendId: expect.stringMatching(UUID) as string,
            state: 'done',
        });
    });

    it('keeps the code that stopped the send, with no response beside it', async () => {
        vi.spyOn(syncBridge.request, 'send').mockResolvedValueOnce(success(RESPONSE));
        await sendItem(RESOURCE);
        vi.spyOn(syncBridge.request, 'send').mockResolvedValueOnce(
            failure('request-timeout', 'slow'),
        );

        await sendItem(RESOURCE);

        expect(requestsStore.getState().sends[RESOURCE]).toEqual({
            error: 'request-timeout',
            message: 'slow',
            sendId: expect.stringMatching(UUID) as string,
            state: 'failed',
        });
    });

    it('takes an answer out of contract for an unknown failure', async () => {
        vi.spyOn(syncBridge.request, 'send').mockRejectedValue(new Error('not a response'));

        await sendItem(RESOURCE);

        expect(requestsStore.getState().sends[RESOURCE]).toEqual({
            error: 'unknown',
            message: 'Error: not a response',
            sendId: expect.stringMatching(UUID) as string,
            state: 'failed',
        });
    });

    it('does not send a second time while one is in flight', async () => {
        const send = vi
            .spyOn(syncBridge.request, 'send')
            .mockReturnValue(new Promise(() => undefined));

        void sendItem(RESOURCE);
        await sendItem(RESOURCE);
        await vi.waitFor(() => {
            expect(send).toHaveBeenCalledTimes(1);
        });
    });

    it('sends nothing for an item that was never read', async () => {
        const send = vi.spyOn(syncBridge.request, 'send');

        await sendItem(itemResource('Local', 'local', 'otro'));

        expect(send).not.toHaveBeenCalled();
    });
});

describe('cancelling the send of a resource', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        requestsStore.getState().reset();
    });

    it('names the send in flight', async () => {
        const cancel = vi.spyOn(syncBridge.request, 'cancel');

        requestsStore.getState().beginSend(RESOURCE, '6f0c2f8e-7a3b-4c52-9a38-0d3f8b8c3e11');
        await cancelItem(RESOURCE);

        expect(cancel).toHaveBeenCalledWith({ sendId: '6f0c2f8e-7a3b-4c52-9a38-0d3f8b8c3e11' });
    });

    it('asks nothing when no send is in flight', async () => {
        const cancel = vi.spyOn(syncBridge.request, 'cancel');

        await cancelItem(RESOURCE);

        expect(cancel).not.toHaveBeenCalled();
    });
});
