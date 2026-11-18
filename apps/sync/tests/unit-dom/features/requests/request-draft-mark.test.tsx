import { ItemProvider, itemLeaf } from '@mandor/collections';
import { act, cleanup, render } from '@testing-library/react';
import { REQUEST_ITEM_KIND, type RequestItem } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RequestDraftMark } from '../../../../src/renderer/features/requests/components/panel/RequestDraftMark.js';
import { RequestItemKind } from '../../../../src/renderer/features/requests/RequestItemKind.js';
import { editRequest } from '../../../../src/renderer/features/requests/lib/pending-request-write.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';
import { AppProviders } from '../../support/app-providers.js';

const RESOURCE = 'Local/local/crear-pedido';

const EDITED: RequestItem = {
    body: { type: 'none' },
    examples: [],
    headers: [],
    method: 'GET',
    name: 'crear pedido',
    pathParams: [],
    query: [],
    settings: { followRedirects: true, maxRedirects: 5, timeoutMs: 30000, validateTls: true },
    url: '{{baseUrl}}',
};

function mark(resource: string): Element | null {
    const { container } = render(
        <ItemProvider value={{ resource, saved: undefined }}>
            <RequestDraftMark />
        </ItemProvider>,
    );

    return container.querySelector('[data-part="request-draft-mark"]');
}

afterEach(cleanup);

describe('the draft mark at the end of the tab of the request', () => {
    beforeEach(() => {
        requestsStore.getState().reset();
    });

    it('stands only while a draft nobody saved is in the window', () => {
        expect(mark(RESOURCE)).toBeNull();

        act(() => {
            editRequest(RESOURCE, EDITED);
        });

        expect(mark(RESOURCE)).not.toBeNull();

        act(() => {
            requestsStore.getState().clearPending(RESOURCE);
        });

        expect(mark(RESOURCE)).toBeNull();
    });

    it('belongs to its request: another tab of another item says nothing', () => {
        act(() => {
            editRequest(RESOURCE, EDITED);
        });

        expect(mark('Local/local/otro')).toBeNull();
    });
});

describe('what the window hears of a draft nobody saved', () => {
    beforeEach(() => {
        requestsStore.getState().reset();
    });

    /** Closing the saved tabs leaves this one: there is work in it that the file does not have. */
    it('is told the request holds work until the draft is saved', () => {
        const { unmount } = render(<RequestItemKind />, { wrapper: AppProviders });
        const dirty = (): boolean | undefined => itemLeaf(REQUEST_ITEM_KIND)?.dirty?.(RESOURCE);

        expect(dirty()).toBe(false);

        act(() => {
            editRequest(RESOURCE, EDITED);
        });

        expect(dirty()).toBe(true);
        unmount();
    });
});
