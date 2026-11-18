import { exampleResource, itemResource } from '@mandor/collections';
import { success } from '@mandor/ipc';
import type { RequestItem } from '@mandor/schema';
import { shellStore, tabKindOf } from '@mandor/shell';
import { translatorIn } from '@mandor/shell/testing/tab-kind';
import { TabOf } from '@mandor/shell/testing/tab-strip';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    RequestExampleTabKind,
    requestsStore,
} from '../../../../src/renderer/features/requests/index.js';
import { EXAMPLE_TAB_KIND } from '../../../../src/renderer/features/requests/lib/open-example.js';
import { AppProviders } from '../../support/app-providers.js';
import { flush } from '../../support/flush.js';

const ITEM = itemResource('Local', 'local', 'crear-pedido');
const RESOURCE = exampleResource('Local', 'local', 'crear-pedido', 'Creado');

const SAVED = { body: '{}', contentType: 'application/json', name: 'Creado', status: '201' };
const REQUEST: RequestItem = {
    body: { type: 'none' },
    examples: [SAVED],
    headers: [],
    method: 'GET',
    name: 'crear pedido',
    pathParams: [],
    query: [],
    settings: { followRedirects: true, maxRedirects: 5, timeoutMs: 30000, validateTls: true },
    url: '/pedidos',
};
const FILE = { ...REQUEST, kind: 'request' };

let unregister: () => void = () => undefined;

beforeEach(() => {
    vi.restoreAllMocks();
    requestsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'local' });
    vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(success(FILE));
    unregister = render(<RequestExampleTabKind />, { wrapper: AppProviders }).unmount;
});

afterEach(() => {
    cleanup();
    unregister();
    requestsStore.getState().reset();
    shellStore.getState().reset();
});

describe('the tab of an example (request-example-tab-kind)', () => {
    it('is titled by the name of the example in its request, and by none before that', () => {
        const kind = tabKindOf(EXAMPLE_TAB_KIND);

        expect(kind.title(RESOURCE, translatorIn('en'))).toBe('');

        requestsStore.getState().beginRead(ITEM);
        requestsStore.getState().finishRead(ITEM, {
            ...REQUEST,
            examples: [{ ...SAVED, name: 'Creado' }],
        });

        expect(kind.title(RESOURCE, translatorIn('en'))).toBe('Creado');
    });

    it('asks before closing only once the example was edited', () => {
        const kind = tabKindOf(EXAMPLE_TAB_KIND);

        expect(kind.dirty?.('t', RESOURCE)).toBe(false);

        requestsStore
            .getState()
            .setExampleDraft(RESOURCE, { example: { ...SAVED, status: '200' } });

        expect(kind.dirty?.('t', RESOURCE)).toBe(true);
    });

    it('lets go of its draft with its tab', () => {
        requestsStore
            .getState()
            .setExampleDraft(RESOURCE, { example: { ...SAVED, status: '200' } });
        tabKindOf(EXAMPLE_TAB_KIND).release?.('t', RESOURCE);

        expect(requestsStore.getState().exampleDrafts[RESOURCE]).toBeUndefined();
    });

    it('saves only its own example when it is saved as it closes', async () => {
        const writeItem = vi
            .spyOn(window.mandor.collections, 'writeItem')
            .mockResolvedValue(success({}));

        requestsStore.getState().beginRead(ITEM);
        requestsStore.getState().finishRead(ITEM, REQUEST);
        requestsStore
            .getState()
            .setExampleDraft(RESOURCE, { example: { ...SAVED, status: '200' } });

        await expect(tabKindOf(EXAMPLE_TAB_KIND).save?.('t', RESOURCE)).resolves.toBeNull();
        expect(writeItem).toHaveBeenCalledOnce();
    });

    it('wears the status of the example and the dot of an unsaved edit', async () => {
        render(
            <TabOf
                tab={{
                    id: `${EXAMPLE_TAB_KIND}-${RESOURCE}`,
                    kind: EXAMPLE_TAB_KIND,
                    resource: RESOURCE,
                }}
            />,
            { wrapper: AppProviders },
        );
        await flush();

        expect(await screen.findByText('201')).toBeVisible();
        expect(document.querySelector('[data-part="example-draft-mark"]')).toBeNull();

        act(() => {
            requestsStore
                .getState()
                .setExampleDraft(RESOURCE, { example: { ...SAVED, status: '200' } });
        });

        expect(document.querySelector('[data-part="example-draft-mark"]')).not.toBeNull();
        expect(screen.getByText('200')).toBeVisible();
    });
});
