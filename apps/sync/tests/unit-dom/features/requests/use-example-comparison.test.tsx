import { exampleResource } from '@mandor/collections';
import type { RequestExample } from '@mandor/schema';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useExampleComparison } from '../../../../src/renderer/features/requests/hooks/useExampleComparison.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';
import { httpResponseWith, textBody } from '../../support/http-response.js';

const RESOURCE = exampleResource('Local', 'local', 'crear-pedido', 'Creado');

const EXAMPLE: RequestExample = {
    body: '{"id":1}',
    contentType: 'application/json',
    name: 'Creado',
    status: '201',
};

describe('how the answer of an example differs from it (useExampleComparison)', () => {
    beforeEach(() => {
        requestsStore.getState().reset();
    });

    afterEach(() => {
        // The hook goes first: resetting a store under a mounted hook is an update outside act.
        cleanup();
        requestsStore.getState().reset();
    });

    it('has nothing to compare before a send came', () => {
        const { result } = renderHook(() => useExampleComparison(RESOURCE, EXAMPLE));

        expect(result.current.entry.state).toBe('idle');
        expect(result.current.comparison).toBeUndefined();
    });

    it('compares the answer with the example once it came', () => {
        const { result } = renderHook(() => useExampleComparison(RESOURCE, EXAMPLE));

        act(() => {
            requestsStore.setState({
                sends: {
                    [RESOURCE]: {
                        response: httpResponseWith({ body: textBody('{"id":"2"}'), status: 201 }),
                        state: 'done',
                    },
                },
            });
        });

        expect(result.current.comparison?.count).toBe(1);
    });

    it('compares again at once when the example is edited', () => {
        requestsStore.setState({
            sends: {
                [RESOURCE]: {
                    response: httpResponseWith({ body: textBody('{"id":"2"}'), status: 201 }),
                    state: 'done',
                },
            },
        });

        const { rerender, result } = renderHook(
            ({ example }) => useExampleComparison(RESOURCE, example),
            { initialProps: { example: EXAMPLE } },
        );

        rerender({ example: { ...EXAMPLE, body: '{"id":"2"}' } });

        expect(result.current.comparison?.count).toBe(0);
    });

    it('compares to nothing when the example is not there', () => {
        requestsStore.setState({
            sends: { [RESOURCE]: { response: httpResponseWith(), state: 'done' } },
        });

        const { result } = renderHook(() => useExampleComparison(RESOURCE, undefined));

        expect(result.current.comparison).toBeUndefined();
    });

    it('counts the values the schema of the example refuses, as the tab shows it', () => {
        requestsStore.setState({
            sends: {
                [RESOURCE]: {
                    response: httpResponseWith({ body: textBody('{"id":"x"}'), status: 201 }),
                    state: 'done',
                },
            },
        });

        const schema = '{"type":"object","properties":{"id":{"type":"number"}}}';
        const { result } = renderHook(() => useExampleComparison(RESOURCE, { ...EXAMPLE, schema }));

        expect(result.current.comparison?.violations).toHaveLength(1);
    });

    it('sets no schema against an answer of a status the example does not stand for', () => {
        requestsStore.setState({
            sends: {
                [RESOURCE]: {
                    response: httpResponseWith({ body: textBody('{"id":"x"}'), status: 500 }),
                    state: 'done',
                },
            },
        });

        const schema = '{"type":"object","properties":{"id":{"type":"number"}}}';
        const { result } = renderHook(() => useExampleComparison(RESOURCE, { ...EXAMPLE, schema }));

        expect(result.current.comparison?.violations).toEqual([]);
    });
});
