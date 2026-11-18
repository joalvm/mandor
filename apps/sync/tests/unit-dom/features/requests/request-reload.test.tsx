import { itemPartsOf, itemResource } from '@mandor/collections';
import { success } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { formatResourceUri, type RequestItem } from '@mandor/schema';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRequest } from '../../../../src/renderer/features/requests/hooks/useRequest.js';
import { editRequest } from '../../../../src/renderer/features/requests/lib/pending-request-write.js';
import { reloadRequest } from '../../../../src/renderer/features/requests/lib/reload-request.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';
import { AppProviders } from '../../support/app-providers.js';

const RESOURCE = itemResource('Local', 'local', 'crear-pedido');
const PARTS = itemPartsOf(RESOURCE);
const OTHER = itemResource('Local', 'local', 'otro');

const TYPED: RequestItem = {
    body: { type: 'none' },
    examples: [],
    headers: [],
    method: 'GET',
    name: 'crear pedido',
    pathParams: [],
    query: [],
    settings: { followRedirects: true, maxRedirects: 5, timeoutMs: 30000, validateTls: true },
    url: 'tecleado',
};

let calls: string[];

function onDisk(url: string): unknown {
    return success({ kind: 'request', name: 'crear pedido', url });
}

beforeEach(() => {
    vi.restoreAllMocks();
    calls = [];
    requestsStore.getState().reset();
    vi.spyOn(window.mandor.collections, 'writeItem').mockImplementation(() => {
        calls.push('write');

        return Promise.resolve(success({}));
    });
    vi.spyOn(window.mandor.collections, 'readItem').mockImplementation(() => {
        calls.push('read');

        return Promise.resolve(onDisk('del disco') as never);
    });
});

describe('reading a request again because its file changed on disk', () => {
    it('reads it and nothing else when there is no draft in the window', async () => {
        await reloadRequest(RESOURCE);

        expect(calls).toEqual(['read']);
    });

    it('a draft nobody saved is not the read to erase: the window keeps showing it', async () => {
        requestsStore.getState().beginRead(RESOURCE);
        requestsStore.getState().finishRead(RESOURCE, TYPED);
        editRequest(RESOURCE, { ...TYPED, url: 'a mitad de tecleo' });

        await reloadRequest(RESOURCE);

        expect(calls).toEqual([]);
        expect(requestsStore.getState().requests[RESOURCE]?.url).toBe('a mitad de tecleo');
        expect(requestsStore.getState().pendings[RESOURCE]?.request.url).toBe('a mitad de tecleo');
    });

    it('keeps what the window shows when the file cannot be read', async () => {
        requestsStore.getState().beginRead(RESOURCE);
        requestsStore.getState().finishRead(RESOURCE, TYPED);
        vi.mocked(window.mandor.collections.readItem).mockResolvedValue({
            ok: false,
            error: { code: 'fs-read', message: 'gone' },
        });

        await reloadRequest(RESOURCE);

        expect(requestsStore.getState().requests[RESOURCE]?.url).toBe('tecleado');
    });

    it('keeps what the window shows when the file says something Mandor cannot read', async () => {
        requestsStore.getState().beginRead(RESOURCE);
        requestsStore.getState().finishRead(RESOURCE, TYPED);
        vi.mocked(window.mandor.collections.readItem).mockResolvedValue(
            success({ kind: 'request', name: 'crear pedido', method: 'post' }),
        );

        await reloadRequest(RESOURCE);

        expect(requestsStore.getState().requests[RESOURCE]?.url).toBe('tecleado');
    });

    it('reads nothing for a resource that names no item', async () => {
        await reloadRequest(
            formatResourceUri({
                scope: 'workspace',
                repo: 'local',
                workspace: 'local',
                kind: 'doc',
                path: 'notas.md',
            }),
        );

        expect(calls).toEqual([]);
    });
});

describe('the request a tab shows when its file changes under it', () => {
    function push(path: string): void {
        act(() => {
            (window.mandor as unknown as FakeBridge).emitRepoChanged({
                changes: [{ area: 'collections', workspaceId: PARTS?.workspaceId ?? '', path }],
            });
        });
    }

    async function opened(): Promise<void> {
        renderHook(() => useRequest(RESOURCE), { wrapper: AppProviders });
        await waitFor(() => {
            expect(requestsStore.getState().requests[RESOURCE]).toBeDefined();
        });
        calls.length = 0;
    }

    it('reads it again when its own file changed', async () => {
        await opened();
        vi.mocked(window.mandor.collections.readItem).mockResolvedValue(onDisk('nuevo') as never);

        push(PARTS?.path ?? '');

        await waitFor(() => {
            expect(requestsStore.getState().requests[RESOURCE]?.url).toBe('nuevo');
        });
    });

    it('leaves it alone when another item changed', async () => {
        await opened();

        push(itemPartsOf(OTHER)?.path ?? '');

        expect(calls).toEqual([]);
    });
});
