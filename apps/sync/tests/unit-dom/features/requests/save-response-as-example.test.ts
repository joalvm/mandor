import { collectionStore, exampleResource, itemResource } from '@mandor/collections';
import { failure, success } from '@mandor/ipc';
import { formatResourceUri, REQUEST_ITEM_KIND, type RequestExample } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { saveResponseAsExample } from '../../../../src/renderer/features/requests/lib/save-response-as-example.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';
import { httpResponseWith, textBody } from '../../support/http-response.js';

const ITEM = itemResource('Local', 'local', 'crear-pedido');

type WriteCall = { fields?: { examples?: RequestExample[] } };

function fileWith(examples: RequestExample[]) {
    return vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(
        success({
            examples,
            kind: REQUEST_ITEM_KIND,
            method: 'GET',
            name: 'crear pedido',
            url: '',
        }),
    );
}

function writes() {
    return vi.spyOn(window.mandor.collections, 'writeItem').mockResolvedValue(success({}));
}

describe('keeping a response as an example', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        requestsStore.getState().reset();
        shellStore.getState().reset();
        collectionStore.getState().reset();
        shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
        shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'local' });
        fileWith([]);
    });

    it('writes it at once, named by its status, and opens it kept', async () => {
        const writeItem = writes();
        const response = httpResponseWith({
            body: textBody('{"id":1}'),
            headers: [['Content-Type', 'application/json']],
            status: 201,
            statusText: 'Created',
        });

        await expect(saveResponseAsExample(ITEM, response)).resolves.toBeNull();

        const [example] = (writeItem.mock.calls[0]?.[0] as WriteCall).fields?.examples ?? [];

        expect(example).toMatchObject({ body: '{"id":1}', name: '201 Created', status: '201' });
        expect(
            shellStore.getState().resources[
                exampleResource('Local', 'local', 'crear-pedido', '201 Created')
            ]?.tabs,
        ).toHaveLength(1);
        expect(collectionStore.getState().examplesClosed['local'] ?? []).not.toContain(
            'crear-pedido',
        );
    });

    it('writes the answer main gave back, with its secrets hidden', async () => {
        const writeItem = writes();
        const hide = vi
            .spyOn(syncBridge.request, 'hideSecrets')
            .mockResolvedValue(success(httpResponseWith({ body: textBody('[redacted]') })));

        await saveResponseAsExample(ITEM, httpResponseWith({ body: textBody('123') }));

        const [example] = (writeItem.mock.calls[0]?.[0] as WriteCall).fields?.examples ?? [];

        expect(hide).toHaveBeenCalledOnce();
        expect(example).toMatchObject({ body: '[redacted]' });
    });

    it('writes nothing when main does not hide it', async () => {
        const writeItem = writes();

        vi.spyOn(syncBridge.request, 'hideSecrets').mockResolvedValue(failure('bad-request', 'no'));

        await expect(
            saveResponseAsExample(ITEM, httpResponseWith({ body: textBody('123') })),
        ).resolves.toBe('bad-request');
        expect(writeItem).not.toHaveBeenCalled();
    });

    it('keeps with it the schema of its body and the params it was sent with', async () => {
        const writeItem = writes();
        const response = httpResponseWith({
            body: textBody('{"id":1}'),
            headers: [['Content-Type', 'application/json']],
        });

        await saveResponseAsExample(ITEM, response, [
            { enabled: true, key: 'fields', value: 'id' },
            { enabled: false, key: 'debug', value: 'true' },
            { enabled: true, key: ' ', value: 'x' },
        ]);

        const [example] = (writeItem.mock.calls[0]?.[0] as WriteCall).fields?.examples ?? [];

        expect(example?.request).toEqual({
            query: [{ enabled: true, key: 'fields', value: 'id' }],
        });
        expect(JSON.parse(example?.schema ?? 'null')).toMatchObject({
            properties: { id: { type: 'number' } },
        });
    });

    it('pins no params when none were sent, and writes no schema for a body that is not JSON', async () => {
        const writeItem = writes();

        await saveResponseAsExample(ITEM, httpResponseWith({ body: textBody('plain') }));

        const [example] = (writeItem.mock.calls[0]?.[0] as WriteCall).fields?.examples ?? [];

        expect(example).not.toHaveProperty('request');
        expect(example).not.toHaveProperty('schema');
    });

    it('numbers the name when another example already wears it', async () => {
        const writeItem = writes();

        fileWith([{ body: '', contentType: '', name: '200 OK', status: '200' }]);
        await saveResponseAsExample(ITEM, httpResponseWith());

        const kept = (writeItem.mock.calls[0]?.[0] as WriteCall).fields?.examples ?? [];

        expect(kept.map((each) => each.name)).toEqual(['200 OK', '200 OK (2)']);
    });

    it('does not write the draft of the request it came from', async () => {
        const writeItem = writes();

        requestsStore.getState().setPending(ITEM, {
            before: undefined,
            request: {
                body: { type: 'none' },
                examples: [],
                headers: [],
                method: 'POST',
                name: 'otro nombre',
                pathParams: [],
                query: [],
                settings: {
                    followRedirects: true,
                    maxRedirects: 5,
                    timeoutMs: 30000,
                    validateTls: true,
                },
                url: '/otro',
            },
        });
        await saveResponseAsExample(ITEM, httpResponseWith());

        const { fields } = writeItem.mock.calls[0]?.[0] as WriteCall;

        expect(Object.keys(fields ?? {}).sort()).toEqual(['examples', 'kind', 'name']);
        expect((fields as { name?: string }).name).toBe('crear pedido');
    });

    it('answers the refusal and opens nothing', async () => {
        vi.spyOn(window.mandor.collections, 'writeItem').mockResolvedValue({
            error: { code: 'fs-write', message: 'no' },
            ok: false,
        });

        await expect(saveResponseAsExample(ITEM, httpResponseWith())).resolves.toBe('fs-write');

        expect(shellStore.getState().resources).toEqual({});
    });

    it('writes nothing for a request saved nowhere', async () => {
        const writeItem = writes();
        const loose = formatResourceUri({
            kind: 'loose',
            path: 'abc',
            repo: 'local',
            scope: 'workspace',
            workspace: 'local',
        });

        await expect(saveResponseAsExample(loose, httpResponseWith())).resolves.toBeNull();

        expect(writeItem).not.toHaveBeenCalled();
    });
});
