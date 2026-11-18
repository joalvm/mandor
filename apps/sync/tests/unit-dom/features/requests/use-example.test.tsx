import { exampleResource, itemResource } from '@mandor/collections';
import { success } from '@mandor/ipc';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useExample } from '../../../../src/renderer/features/requests/hooks/useExample.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';
import { AppProviders } from '../../support/app-providers.js';

const ITEM = itemResource('Local', 'local', 'crear-pedido');
const CREATED = exampleResource('Local', 'local', 'crear-pedido', 'Creado');
const MISSING = exampleResource('Local', 'local', 'crear-pedido', 'Nada');

const SAVED = { body: '{}', contentType: 'application/json', name: 'Creado', status: '201' };

describe('the example behind a resource', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        requestsStore.getState().reset();
        vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(
            success({
                examples: [SAVED],
                kind: 'request',
                method: 'GET',
                name: 'crear pedido',
                url: '/pedidos',
            }),
        );
    });

    it('reads the request it hangs from and answers the example the file holds', async () => {
        const { result } = renderHook(() => useExample(CREATED), { wrapper: AppProviders });

        expect(result.current).toBeUndefined();

        await waitFor(() => {
            expect(result.current).toMatchObject({
                example: SAVED,
                item: ITEM,
                key: 'Creado',
                saved: SAVED,
            });
        });
        expect(result.current?.parent.name).toBe('crear pedido');
    });

    it('answers what was typed in front of what the file holds', async () => {
        requestsStore.getState().setExampleDraft(CREATED, { example: { ...SAVED, status: '200' } });

        const { result } = renderHook(() => useExample(CREATED), { wrapper: AppProviders });

        await waitFor(() => {
            expect(result.current?.example.status).toBe('200');
        });
        expect(result.current?.saved.status).toBe('201');
    });

    it('answers the schema typed into the example in front of the one the file holds', async () => {
        requestsStore
            .getState()
            .setExampleDraft(CREATED, { example: { ...SAVED, schema: '{"a":1}' } });

        const { result } = renderHook(() => useExample(CREATED), { wrapper: AppProviders });

        await waitFor(() => {
            expect(result.current?.example.schema).toBe('{"a":1}');
        });
        expect(result.current?.saved.schema).toBeUndefined();
    });

    it('answers the schema the file keeps with the example when nothing was typed', async () => {
        vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(
            success({
                examples: [{ ...SAVED, schema: '{"b":2}' }],
                kind: 'request',
                method: 'GET',
                name: 'crear pedido',
                url: '/pedidos',
            }),
        );

        const { result } = renderHook(() => useExample(CREATED), { wrapper: AppProviders });

        await waitFor(() => {
            expect(result.current?.example.schema).toBe('{"b":2}');
        });
    });

    it('answers nothing for an example the file does not hold', async () => {
        const { result } = renderHook(() => useExample(MISSING), { wrapper: AppProviders });

        await waitFor(() => {
            expect(requestsStore.getState().requests[ITEM]).toBeDefined();
        });
        expect(result.current).toBeUndefined();
    });

    it('answers nothing for a resource that is no example', async () => {
        const { result } = renderHook(() => useExample(ITEM), { wrapper: AppProviders });

        await waitFor(() => {
            expect(requestsStore.getState().requests[ITEM]).toBeDefined();
        });
        expect(result.current).toBeUndefined();
    });
});
