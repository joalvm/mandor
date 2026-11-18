import { createRequestItem, type RequestItem } from '@mandor/schema';
import type { ToastRequest } from '@mandor/ui';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useBodySchemaGeneration } from '../../../../src/renderer/features/requests/hooks/useBodySchemaGeneration.js';
import { AppProviders } from '../../support/app-providers.js';

const SCHEMA =
    '{"type":"object","properties":{"id":{"type":"integer"}},"required":["id"],"additionalProperties":false}';

/** A schema with a rule no body tells: generating from the body would lose it. */
const RESTRICTED = '{"type":"object","properties":{"id":{"type":"integer","minimum":1}}}';

function json(content: string, bodySchema?: string): RequestItem {
    return {
        ...createRequestItem({ name: 'pedido' }),
        body: { content, type: 'json' },
        bodySchema,
    };
}

function generation(request: RequestItem, onNotify?: (request: ToastRequest) => void) {
    const onChange = vi.fn();

    function wrapper({ children }: PropsWithChildren) {
        return <AppProviders onNotify={onNotify}>{children}</AppProviders>;
    }

    const { result } = renderHook(() => useBodySchemaGeneration(request, onChange), { wrapper });

    return { onChange, result };
}

describe('the generations between a body and its schema', () => {
    afterEach(() => {
        cleanup();
    });

    it('offers nothing for a body that is not json', () => {
        const { result } = generation({
            ...createRequestItem({ name: 'texto' }),
            body: { content: 'hola', type: 'text' },
            bodySchema: SCHEMA,
        });

        expect(result.current).toEqual({ generateBody: undefined, generateSchema: undefined });
    });

    it('writes the schema a json body tells, and offers no body without a schema', () => {
        const { onChange, result } = generation(json('{"id": 1}'));

        expect(result.current.generateBody).toBeUndefined();

        act(() => {
            result.current.generateSchema?.();
        });

        expect(onChange).toHaveBeenCalledWith({
            bodySchema: expect.stringContaining('"id"') as unknown,
        });
    });

    it('writes the body the schema asks for over an empty one, without asking', () => {
        const onNotify = vi.fn();
        const { onChange, result } = generation(json('', SCHEMA), onNotify);

        act(() => {
            result.current.generateBody?.();
        });

        expect(onNotify).not.toHaveBeenCalled();
        expect(onChange).toHaveBeenCalledWith({
            body: { content: expect.stringContaining('"id"') as unknown, type: 'json' },
        });
    });

    it('asks before replacing a body with changes of its own, and replaces it on the answer', () => {
        const asked: ToastRequest[] = [];
        const { onChange, result } = generation(json('{"id": "x"}', SCHEMA), (request) => {
            asked.push(request);
        });

        act(() => {
            result.current.generateBody?.();
        });

        expect(onChange).not.toHaveBeenCalled();
        expect(asked.map((request) => request.title)).toEqual([
            'The current body has changes of its own',
        ]);

        act(() => {
            asked[0]?.action?.onSelect();
        });

        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('asks before replacing a schema that says more than the body can rebuild', () => {
        const asked: ToastRequest[] = [];
        const { onChange, result } = generation(json('{"id": 1}', RESTRICTED), (request) => {
            asked.push(request);
        });

        act(() => {
            result.current.generateSchema?.();
        });

        expect(onChange).not.toHaveBeenCalled();
        expect(asked.map((request) => request.title)).toEqual([
            'The current schema carries restrictions',
        ]);
    });
});
