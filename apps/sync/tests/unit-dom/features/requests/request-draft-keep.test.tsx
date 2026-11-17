import { ROOT_GROUP_ID } from '@mandor/ipc';
import type { RequestItem } from '@mandor/schema';
import { shellStore, TabProvider } from '@mandor/shell';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useRequestDraft } from '../../../../src/renderer/features/requests/components/panel/useRequestDraft.js';
import { AppProviders } from '../../support/app-providers.js';

const RESOURCE = 'mandor://local/events/item/crear-pedido';

const REQUEST: RequestItem = {
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

function inTab({ children }: { children: ReactNode }) {
    return (
        <AppProviders>
            <TabProvider value={{ resource: RESOURCE, tabId: 'request' }}>{children}</TabProvider>
        </AppProviders>
    );
}

describe('editing a request that was only open to look at it', () => {
    it('keeps its tab, so the next look opens beside it', () => {
        shellStore
            .getState()
            .openTab(
                ROOT_GROUP_ID,
                { id: 'request', kind: 'item', resource: RESOURCE },
                { preview: true },
            );

        const { result } = renderHook(() => useRequestDraft({ resource: RESOURCE }, REQUEST), {
            wrapper: inTab,
        });

        act(() => {
            result.current.edit({ method: 'POST' });
        });

        expect(JSON.stringify(shellStore.getState().grid)).not.toContain('preview');
    });
});
