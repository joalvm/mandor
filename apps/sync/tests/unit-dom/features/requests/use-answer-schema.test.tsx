import { exampleResource, itemResource } from '@mandor/collections';
import type { RequestExample, RequestItem } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { act, cleanup, renderHook, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useAnswerSchema } from '../../../../src/renderer/features/requests/hooks/useAnswerSchema.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';
import type { SendEntry } from '../../../../src/renderer/features/requests/responses.slice.js';
import { AppProviders } from '../../support/app-providers.js';
import { httpResponseWith, textBody } from '../../support/http-response.js';

const ITEM = itemResource('Local', 'local', 'pedidos');
const LIST: RequestExample = {
    body: '[]',
    contentType: 'application/json',
    name: 'Lista',
    schema: '{"type":"array"}',
    status: '200',
};
const PAGED: RequestExample = {
    ...LIST,
    name: 'Paginado',
    request: { query: [{ enabled: true, key: 'paginate', value: 'true' }] },
    schema: '{"type":"object","properties":{"items":{"type":"array"}}}',
};
const MISSING: RequestExample = { ...LIST, name: 'Nada', schema: '{}', status: '404' };
const REQUEST: RequestItem = {
    body: { type: 'none' },
    examples: [LIST, PAGED, MISSING],
    headers: [],
    method: 'GET',
    name: 'pedidos',
    pathParams: [],
    query: [],
    settings: { followRedirects: true, maxRedirects: 5, timeoutMs: 30000, validateTls: true },
    url: '',
};
const PAGED_RESOURCE = exampleResource('Local', 'local', 'pedidos', 'Paginado');

function done(body: string, paginate: boolean, status = 200): SendEntry {
    return {
        query: paginate ? [{ enabled: true, key: 'paginate', value: 'true' }] : [],
        response: httpResponseWith({ body: textBody(body), status }),
        state: 'done',
    };
}

function answer(entry: SendEntry) {
    return renderHook(() => useAnswerSchema(ITEM, REQUEST, entry), {
        wrapper: ({ children }: PropsWithChildren) => <AppProviders>{children}</AppProviders>,
    }).result;
}

describe('the schema an answer answers to (useAnswerSchema)', () => {
    beforeEach(() => {
        requestsStore.getState().reset();
        requestsStore.getState().beginRead(ITEM);
        requestsStore.getState().finishRead(ITEM, REQUEST);
        shellStore.getState().reset();
        shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
        shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'local' });
    });

    afterEach(() => {
        // The hook goes first: resetting a store under a mounted hook is an update outside act.
        cleanup();
        requestsStore.getState().reset();
    });

    it('reads the schema of the example whose params were sent, among those of the status', () => {
        const result = answer(done('{"items":[]}', true));

        expect(result.current).toMatchObject({
            chosen: 'Paginado',
            examples: [
                { key: 'Paginado', name: 'Paginado' },
                { key: 'Lista', name: 'Lista' },
            ],
            issues: [],
            modelKey: `${PAGED_RESOURCE}#schema`,
            text: PAGED.schema,
        });
    });

    it('sets the answer against the schema read, and against the one chosen instead', () => {
        const result = answer(done('[]', true));

        expect(result.current?.issues).toHaveLength(1);

        act(() => {
            result.current?.onChoose('Lista');
        });

        expect(result.current).toMatchObject({ chosen: 'Lista', issues: [], text: LIST.schema });
    });

    it('writes what is typed, and what is generated, as the draft of the example read', () => {
        const result = answer(done('{"items":[1]}', true));

        act(() => {
            result.current?.onChange('{"type":"object"}');
        });

        expect(requestsStore.getState().exampleDrafts[PAGED_RESOURCE]?.example.schema).toBe(
            '{"type":"object"}',
        );
        expect(result.current?.text).toBe('{"type":"object"}');

        act(() => {
            result.current?.onGenerate();
        });

        expect(
            JSON.parse(
                requestsStore.getState().exampleDrafts[PAGED_RESOURCE]?.example.schema ?? 'null',
            ),
        ).toMatchObject({ properties: { items: { type: 'array' } } });
    });

    it('tells an answer that is not JSON has no schema to write, and writes nothing', async () => {
        const result = answer(done('plain', false));

        act(() => {
            result.current?.onGenerate();
        });

        expect(await screen.findByText('The response is not JSON')).toBeVisible();
        expect(requestsStore.getState().exampleDrafts).toEqual({});
    });

    it('has no schema before the answer came, nor for a status no example has', () => {
        expect(answer({ state: 'idle' }).current).toBeUndefined();
        expect(answer(done('{}', false, 500)).current).toBeUndefined();
    });
});
