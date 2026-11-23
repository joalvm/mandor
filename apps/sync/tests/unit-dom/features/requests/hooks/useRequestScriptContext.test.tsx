import { itemResource } from '@mandor/collections';
import { envStore } from '@mandor/env';
import { createEnvironment, createRequestItem, type RequestItem } from '@mandor/schema';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useFolderScriptContext } from '../../../../../src/renderer/features/requests/hooks/useFolderScriptContext.js';
import { useRequestScriptContext } from '../../../../../src/renderer/features/requests/hooks/useRequestScriptContext.js';
import { requestsStore } from '../../../../../src/renderer/features/requests/requests-store.js';
import { httpResponseWith, textBody } from '../../../support/http-response.js';

const RESOURCE = itemResource('Local', 'tienda', 'crear-pedido');

const STAGING = {
    ...createEnvironment({ id: 'staging', name: 'Staging' }),
    variables: [
        { enabled: true, name: 'token', secret: true, value: 'a-very-long-secret' },
        { enabled: true, name: 'base', secret: false, value: 'https://shop.test' },
    ],
};

const REQUEST: RequestItem = {
    ...createRequestItem({ name: 'Crear pedido' }),
    headers: [{ enabled: true, key: 'Authorization', value: 'Bearer {{token}}' }],
    scripts: { onResponse: { source: 'mandor.variables.set("orderId", 1);' } },
};

beforeEach(() => {
    envStore.setState({ activeEnvironmentIds: { tienda: 'staging' }, environments: [STAGING] });
});

afterEach(() => {
    cleanup();
    envStore.getState().reset();
    requestsStore.getState().reset();
});

describe('what the editors of the scripts of a request know', () => {
    it('lists the variables of its environment, secrets masked, then what its scripts declare', () => {
        const { result } = renderHook(() => useRequestScriptContext(RESOURCE, REQUEST));

        expect(result.current.variables).toEqual([
            { name: 'token', origin: 'environment', secret: true, value: '••••••••••••••' },
            { name: 'base', origin: 'environment', secret: false, value: 'https://shop.test' },
            { name: 'orderId', origin: 'script', secret: false, value: '' },
        ]);
        expect(JSON.stringify(result.current)).not.toContain('a-very-long-secret');
        expect(result.current.headers).toEqual(['Authorization']);
    });

    it('reads the last answer as the sample once it came back', () => {
        const { result } = renderHook(() => useRequestScriptContext(RESOURCE, REQUEST));

        expect(result.current.sample).toBeUndefined();

        act(() => {
            requestsStore.setState({
                sends: {
                    [RESOURCE]: {
                        response: httpResponseWith({ body: textBody('{"id": 7}') }),
                        state: 'done',
                    },
                },
            });
        });

        expect(result.current.sample).toEqual({ id: 7 });
    });

    /** Typing a script changes its text at every key: what the editors know waits for a name. */
    it('stays the same object while the names its scripts declare stay the same', () => {
        const { rerender, result } = renderHook(
            ({ request }: { request: RequestItem }) => useRequestScriptContext(RESOURCE, request),
            { initialProps: { request: REQUEST } },
        );
        const first = result.current;

        rerender({
            request: {
                ...REQUEST,
                scripts: { onResponse: { source: 'mandor.variables.set("orderId", 2);' } },
            },
        });

        expect(result.current).toBe(first);
    });
});

describe('what the editors of the scripts of a group know', () => {
    it('lists the variables of the environment of its workspace, and no header nor sample', () => {
        const { result } = renderHook(() => useFolderScriptContext('tienda', 'pedidos'));

        expect(result.current.variables.map(({ name }) => name)).toEqual(['token', 'base']);
        expect(result.current.headers).toEqual([]);
        expect(result.current.sample).toBeUndefined();
    });
});
