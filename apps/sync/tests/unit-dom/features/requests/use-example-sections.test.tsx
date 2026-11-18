import { exampleResource, itemResource } from '@mandor/collections';
import { parseCollectionItem, parseRequestItem } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ExampleView } from '../../../../src/renderer/features/requests/hooks/useExample.js';
import { useExampleSections } from '../../../../src/renderer/features/requests/hooks/useExampleSections.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';
import { AppProviders } from '../../support/app-providers.js';
import { httpResponseWith, textBody } from '../../support/http-response.js';

const ITEM = itemResource('Local', 'local', 'crear-pedido');
const RESOURCE = exampleResource('Local', 'local', 'crear-pedido', 'Creado');

const PARENT = parseRequestItem(
    parseCollectionItem({
        examples: [
            { body: '{"id":1}', contentType: 'application/json', name: 'Creado', status: '200' },
        ],
        kind: 'request',
        method: 'GET',
        name: 'crear pedido',
        url: 'http://x/pedidos',
    }),
);

const EXAMPLE = PARENT.examples[0] ?? { body: '', contentType: '', name: '', status: '' };
const SCHEMA = '{"type":"object","properties":{"id":{"type":"string"}}}';

const VIEW: ExampleView = {
    example: { ...EXAMPLE, schema: SCHEMA },
    item: ITEM,
    key: 'Creado',
    parent: PARENT,
    saved: EXAMPLE,
};

const DONE = {
    response: httpResponseWith({ body: textBody('{"id":2}'), status: 200 }),
    state: 'done',
} as const;

function sections() {
    return renderHook(() => useExampleSections(RESOURCE, VIEW, DONE), {
        wrapper: ({ children }: PropsWithChildren) => <AppProviders>{children}</AppProviders>,
    }).result;
}

describe('what the sections under the response hang on (useExampleSections)', () => {
    beforeEach(() => {
        shellStore.getState().reset();
        requestsStore.getState().reset();
        requestsStore.getState().setRequest(ITEM, PARENT);
    });

    afterEach(() => {
        // The hook goes first: resetting a store under a mounted hook is an update outside act.
        cleanup();
        requestsStore.getState().reset();
    });

    it('opens on the body, and opens the section it is told to', () => {
        const result = sections();

        expect(result.current.section).toBe('body');

        act(() => {
            result.current.setSection('headers');
        });

        expect(result.current.section).toBe('headers');
    });

    it('keeps the section it was left on when the panel is drawn anew', () => {
        const first = sections();

        act(() => {
            first.current.setSection('schema');
        });
        cleanup();

        expect(sections().current.section).toBe('schema');
    });

    it('carries the schema of the example as the Schema tab needs it', () => {
        expect(sections().current.schema.text).toBe(SCHEMA);
    });

    it('opens the schema once an answer is taken that the schema still refuses', async () => {
        const result = sections();

        act(() => {
            result.current.review.accept();
        });

        await waitFor(() => {
            expect(result.current.section).toBe('schema');
        });
    });
});
