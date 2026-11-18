import { envStore } from '@mandor/env';
import { success } from '@mandor/ipc';
import { formatResourceUri } from '@mandor/schema';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { useGraphqlSchema } from '../../../../src/renderer/features/requests/hooks/useGraphqlSchema.js';
import {
    GRAPHQL_CACHE,
    GRAPHQL_REQUEST,
    GRAPHQL_REQUEST_SENT,
    GRAPHQL_RESOURCE,
} from '../../support/graphql-schema-fixtures.js';

describe('the schema kept for a graphql request', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        envStore.getState().reset();
    });

    afterEach(() => {
        cleanup();
        envStore.getState().reset();
    });

    it('is none while nothing was kept, and asks the server for nothing', async () => {
        const read = vi.spyOn(syncBridge.graphql, 'readSchema');
        const ask = vi.spyOn(syncBridge.graphql, 'introspect');

        const { result } = renderHook(() =>
            useGraphqlSchema(GRAPHQL_RESOURCE, GRAPHQL_REQUEST, true),
        );

        await waitFor(() => {
            expect(read).toHaveBeenCalledTimes(1);
        });
        expect(result.current.facts.cache).toBeNull();
        expect(ask).not.toHaveBeenCalled();
    });

    it('brings the schema kept for the server, with the environment that is active', async () => {
        envStore.setState({ activeEnvironmentIds: { alpha: 'staging' } });
        const read = vi
            .spyOn(syncBridge.graphql, 'readSchema')
            .mockResolvedValue(success(GRAPHQL_CACHE));

        const { result } = renderHook(() =>
            useGraphqlSchema(GRAPHQL_RESOURCE, GRAPHQL_REQUEST, true),
        );

        await waitFor(() => {
            expect(result.current.facts.cache).toEqual(GRAPHQL_CACHE);
        });

        expect(read).toHaveBeenCalledWith({
            environmentId: 'staging',
            itemPath: 'orders/list',
            request: GRAPHQL_REQUEST_SENT,
            workspaceId: 'alpha',
        });
    });

    it('reads nothing for a request that is not graphql', () => {
        const read = vi.spyOn(syncBridge.graphql, 'readSchema');

        const { result } = renderHook(() =>
            useGraphqlSchema(GRAPHQL_RESOURCE, GRAPHQL_REQUEST, false),
        );

        expect(read).not.toHaveBeenCalled();
        expect(result.current.facts.cache).toBeNull();
    });

    it('reads again when the url changes, and lets go of the schema of the old server', async () => {
        const read = vi
            .spyOn(syncBridge.graphql, 'readSchema')
            .mockResolvedValueOnce(success(GRAPHQL_CACHE))
            .mockResolvedValue(success(null));

        const { rerender, result } = renderHook(
            ({ request }) => useGraphqlSchema(GRAPHQL_RESOURCE, request, true),
            { initialProps: { request: GRAPHQL_REQUEST } },
        );

        await waitFor(() => {
            expect(result.current.facts.cache).toEqual(GRAPHQL_CACHE);
        });

        rerender({ request: { ...GRAPHQL_REQUEST, url: 'http://localhost/other' } });

        await waitFor(() => {
            expect(result.current.facts.cache).toBeNull();
        });
        expect(read).toHaveBeenCalledTimes(2);
    });

    it('does not read again for an edit that leaves the server where it was', async () => {
        const read = vi.spyOn(syncBridge.graphql, 'readSchema');

        const { rerender } = renderHook(
            ({ request }) => useGraphqlSchema(GRAPHQL_RESOURCE, request, true),
            { initialProps: { request: GRAPHQL_REQUEST } },
        );

        await waitFor(() => {
            expect(read).toHaveBeenCalledTimes(1);
        });

        rerender({
            request: {
                ...GRAPHQL_REQUEST,
                body: { query: '{ b }', type: 'graphql', variables: '' },
            },
        });

        expect(read).toHaveBeenCalledTimes(1);
    });

    it('is nothing for a resource that is not an item', () => {
        const read = vi.spyOn(syncBridge.graphql, 'readSchema');
        const settings = formatResourceUri({ name: 'settings', scope: 'app' });

        const { result } = renderHook(() => useGraphqlSchema(settings, GRAPHQL_REQUEST, true));

        act(() => {
            result.current.refresh();
        });

        expect(read).not.toHaveBeenCalled();
        expect(result.current.facts).toMatchObject({ cache: null, loading: false });
    });
});
