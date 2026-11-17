import { exampleResource, itemResource } from '@mandor/collections';
import { parseCollectionItem, parseRequestItem } from '@mandor/schema';
import { act, cleanup, renderHook, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ExampleView } from '../../../../src/renderer/features/requests/hooks/useExample.js';
import { useExampleSchema } from '../../../../src/renderer/features/requests/hooks/useExampleSchema.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';
import { AppProviders } from '../../support/app-providers.js';

const ITEM = itemResource('Local', 'local', 'crear-pedido');
const RESOURCE = exampleResource('Local', 'local', 'crear-pedido', 'Creado');

const PARENT = parseRequestItem(
    parseCollectionItem({
        examples: [
            { body: '{"id":1}', contentType: 'application/json', name: 'Creado', status: '201' },
            { body: '{"id":2}', contentType: 'application/json', name: 'Otro', status: '201' },
        ],
        kind: 'request',
        method: 'POST',
        name: 'crear pedido',
        url: 'http://x/pedidos',
    }),
);

const EXAMPLE = PARENT.examples[0] ?? { body: '', contentType: '', name: '', status: '' };

function viewWith(body: string, schema?: string): ExampleView {
    return {
        example: { ...EXAMPLE, body, ...(schema !== undefined && { schema }) },
        item: ITEM,
        key: 'Creado',
        parent: PARENT,
        saved: EXAMPLE,
    };
}

function tab(view: ExampleView | undefined) {
    return renderHook(() => useExampleSchema(RESOURCE, view), {
        wrapper: ({ children }: PropsWithChildren) => <AppProviders>{children}</AppProviders>,
    }).result;
}

describe('what the Schema tab of an example needs (useExampleSchema)', () => {
    beforeEach(() => {
        requestsStore.getState().reset();
        requestsStore.getState().setRequest(ITEM, PARENT);
    });

    afterEach(() => {
        // The hook goes first: resetting a store under a mounted hook is an update outside act.
        cleanup();
        requestsStore.getState().reset();
    });

    it('carries the text of the schema the example keeps', () => {
        const result = tab(viewWith('{"id":1}', '{"type":"object"}'));

        expect(result.current).toMatchObject({ error: undefined, text: '{"type":"object"}' });
    });

    it('says why a text that is no schema cannot be read', () => {
        const result = tab(viewWith('{}', '{"type":'));

        expect(result.current.error).toEqual(expect.any(String));
    });

    it('writes the schema from the expected body as a draft of the example', () => {
        const result = tab(viewWith('{"id":1}'));

        act(() => {
            result.current.onGenerate();
        });

        const draft = requestsStore.getState().exampleDrafts[RESOURCE];

        expect(JSON.parse(draft?.example.schema ?? 'null')).toMatchObject({
            properties: { id: { type: 'number' } },
            required: ['id'],
        });
    });

    it('tells a body that is not JSON has no schema to write, and writes nothing', async () => {
        const result = tab(viewWith('plain text'));

        act(() => {
            result.current.onGenerate();
        });

        expect(await screen.findByText('The expected body is not JSON')).toBeVisible();
        expect(requestsStore.getState().exampleDrafts[RESOURCE]).toBeUndefined();
    });

    it('keeps what is typed as the schema of the draft', () => {
        const result = tab(viewWith('{"id":1}'));

        act(() => {
            result.current.onChange('{"type":"object"}');
        });

        expect(requestsStore.getState().exampleDrafts[RESOURCE]?.example.schema).toBe(
            '{"type":"object"}',
        );
    });

    it('has nothing to carry without an example', () => {
        const result = tab(undefined);

        expect(result.current).toMatchObject({ error: undefined, text: undefined });
    });
});
