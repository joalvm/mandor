import { ItemProvider } from '@mandor/collections';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { RequestItem } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RequestMethodMark } from '../../../../src/renderer/features/requests/components/panel/RequestMethodMark.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';

const RESOURCE = 'Local/local/crear-pedido';

const READ: RequestItem = {
    body: { type: 'none' },
    examples: [],
    headers: [],
    method: 'PUT',
    name: 'crear pedido',
    pathParams: [],
    query: [],
    settings: { followRedirects: true, maxRedirects: 5, timeoutMs: 30000, validateTls: true },
    url: '{{baseUrl}}',
};

afterEach(cleanup);

describe('the method a request wears in its row and its tab', () => {
    beforeEach(() => {
        requestsStore.getState().reset();
    });

    it('says what the file says for a request the window never opened', () => {
        render(
            <ItemProvider value={{ resource: RESOURCE, saved: 'POST' }}>
                <RequestMethodMark />
            </ItemProvider>,
        );

        expect(screen.getByText('POST')).toHaveAttribute('data-method', 'POST');
    });

    it('says what the window read, and then the draft, before anything is saved', () => {
        render(
            <ItemProvider value={{ resource: RESOURCE, saved: 'POST' }}>
                <RequestMethodMark />
            </ItemProvider>,
        );

        act(() => {
            requestsStore.getState().setRequest(RESOURCE, READ);
        });

        expect(screen.getByText('PUT')).toBeInTheDocument();

        act(() => {
            requestsStore.getState().setPending(RESOURCE, {
                before: READ,
                request: { ...READ, method: 'DELETE' },
            });
        });

        expect(screen.getByText('DEL')).toHaveAttribute('data-method', 'DELETE');
    });

    it('falls back to GET when nothing says otherwise', () => {
        render(
            <ItemProvider value={{ resource: RESOURCE, saved: undefined }}>
                <RequestMethodMark />
            </ItemProvider>,
        );

        expect(screen.getByText('GET')).toBeInTheDocument();
    });
});
