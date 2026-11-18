import { failure, success } from '@mandor/ipc';
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

describe('asking the server for the schema of a graphql request', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(cleanup);

    it('asks with the request as it is on screen, says it is loading, and keeps the answer', async () => {
        const ask = vi
            .spyOn(syncBridge.graphql, 'introspect')
            .mockResolvedValue(success(GRAPHQL_CACHE));

        const { result } = renderHook(() =>
            useGraphqlSchema(GRAPHQL_RESOURCE, GRAPHQL_REQUEST, true),
        );

        act(() => {
            result.current.refresh();
        });

        expect(result.current.facts.loading).toBe(true);
        await waitFor(() => {
            expect(result.current.facts).toMatchObject({ cache: GRAPHQL_CACHE, loading: false });
        });
        expect(ask).toHaveBeenCalledWith({
            environmentId: null,
            itemPath: 'orders/list',
            request: GRAPHQL_REQUEST_SENT,
            workspaceId: 'alpha',
        });
    });

    it('says the way an ask failed and keeps the schema it had', async () => {
        vi.spyOn(syncBridge.graphql, 'readSchema').mockResolvedValue(success(GRAPHQL_CACHE));
        vi.spyOn(syncBridge.graphql, 'introspect').mockResolvedValue(
            failure('request-timeout', 'late'),
        );

        const { result } = renderHook(() =>
            useGraphqlSchema(GRAPHQL_RESOURCE, GRAPHQL_REQUEST, true),
        );

        await waitFor(() => {
            expect(result.current.facts.cache).toEqual(GRAPHQL_CACHE);
        });

        act(() => {
            result.current.refresh();
        });

        await waitFor(() => {
            expect(result.current.facts.error).toBe('request-timeout');
        });
        expect(result.current.facts.cache).toEqual(GRAPHQL_CACHE);
    });

    it('says an ask that threw as unknown', async () => {
        vi.spyOn(syncBridge.graphql, 'introspect').mockRejectedValue(new Error('boom'));

        const { result } = renderHook(() =>
            useGraphqlSchema(GRAPHQL_RESOURCE, GRAPHQL_REQUEST, true),
        );

        act(() => {
            result.current.refresh();
        });

        await waitFor(() => {
            expect(result.current.facts.error).toBe('unknown');
        });
    });

    it('drops the answer of an ask that a newer read overtook', async () => {
        let answer: (
            value: Awaited<ReturnType<typeof syncBridge.graphql.introspect>>,
        ) => void = () => undefined;

        vi.spyOn(syncBridge.graphql, 'introspect').mockReturnValue(
            new Promise((resolve) => {
                answer = resolve;
            }),
        );

        const { rerender, result } = renderHook(
            ({ request }) => useGraphqlSchema(GRAPHQL_RESOURCE, request, true),
            { initialProps: { request: GRAPHQL_REQUEST } },
        );

        act(() => {
            result.current.refresh();
        });
        rerender({ request: { ...GRAPHQL_REQUEST, url: 'http://localhost/other' } });
        await act(async () => {
            answer(success(GRAPHQL_CACHE));
            await Promise.resolve();
        });

        expect(result.current.facts.cache).toBeNull();
    });
});
