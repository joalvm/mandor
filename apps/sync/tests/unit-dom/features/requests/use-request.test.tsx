import { itemResource } from '@mandor/collections';
import { success } from '@mandor/ipc';
import { renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRequest } from '../../../../src/renderer/features/requests/hooks/useRequest.js';
import {
    requestsStore,
    type RequestsStoreApi,
} from '../../../../src/renderer/features/requests/requests-store.js';
import { AppProviders } from '../../support/app-providers.js';

const RESOURCE = itemResource('Local', 'local', 'crear-pedido');

describe('useRequest', () => {
    let store: RequestsStoreApi;

    beforeEach(() => {
        vi.restoreAllMocks();
        store = requestsStore;
        store.getState().reset();
    });

    it('brings the item the first time somebody looks at it', async () => {
        vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(
            success({ kind: 'request', name: 'crear pedido', url: '{{baseUrl}}' }),
        );

        const { result } = renderHook(() => useRequest(RESOURCE), {
            wrapper: AppProviders,
        });

        await waitFor(() => {
            expect(result.current).toBeDefined();
        });

        expect(result.current?.url).toBe('{{baseUrl}}');
    });

    it('a body Mandor cannot read is told as a toast, and the resource stays empty', async () => {
        vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(
            success({ kind: 'request', name: 'crear pedido', method: 'post' }),
        );

        const { result } = renderHook(() => useRequest(RESOURCE), {
            wrapper: AppProviders,
        });

        expect(
            await screen.findByText('Mandor could not read the requested file.'),
        ).toBeInTheDocument();
        expect(result.current).toBeUndefined();
    });
});
