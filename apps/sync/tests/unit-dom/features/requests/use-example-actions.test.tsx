import { exampleResource, itemResource } from '@mandor/collections';
import { success } from '@mandor/ipc';
import { REQUEST_ITEM_KIND } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import type { ToastRequest } from '@mandor/ui';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useExampleActions } from '../../../../src/renderer/features/requests/hooks/useExampleActions.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';
import { AppProviders } from '../../support/app-providers.js';
import { httpResponseWith } from '../../support/http-response.js';

const ITEM = itemResource('Local', 'local', 'crear-pedido');
const CREATED = exampleResource('Local', 'local', 'crear-pedido', 'Creado');
const FILE = {
    examples: [{ body: '', contentType: 'application/json', name: 'Creado', status: '201' }],
    kind: REQUEST_ITEM_KIND,
    method: 'GET',
    name: 'crear pedido',
    url: '',
};

const heard: ToastRequest[] = [];

function Providers({ children }: PropsWithChildren) {
    return (
        <AppProviders
            onNotify={(request) => {
                heard.push(request);
            }}
        >
            {children}
        </AppProviders>
    );
}

describe('the actions on the examples of a request (useExampleActions)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        heard.length = 0;
        requestsStore.getState().reset();
        shellStore.getState().reset();
        shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
        shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'local' });
        vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(success(FILE));
    });

    it('tells a refusal in the words of its code', async () => {
        vi.spyOn(window.mandor.collections, 'writeItem').mockResolvedValue({
            error: { code: 'fs-write', message: 'no' },
            ok: false,
        });

        const { result } = renderHook(() => useExampleActions(), { wrapper: Providers });

        await act(async () => {
            await result.current.logic.rename(CREATED, 'Alta');
        });

        expect(heard).toHaveLength(1);
        expect(heard[0]).toMatchObject({ tone: 'error' });
    });

    it('says nothing when a rename goes through', async () => {
        vi.spyOn(window.mandor.collections, 'writeItem').mockResolvedValue(success({}));

        const { result } = renderHook(() => useExampleActions(), { wrapper: Providers });

        await result.current.logic.rename(CREATED, 'Alta');
        await result.current.logic.duplicate(CREATED);
        await result.current.logic.remove([CREATED]);
        await result.current.newExample(ITEM);

        expect(heard).toEqual([]);
    });

    it('words the copy and the new example in the language of the window', async () => {
        const writeItem = vi
            .spyOn(window.mandor.collections, 'writeItem')
            .mockResolvedValue(success({}));

        const { result } = renderHook(() => useExampleActions(), { wrapper: Providers });

        await result.current.logic.duplicate(CREATED);
        await result.current.newExample(ITEM);

        const names = writeItem.mock.calls.map((call) =>
            (call[0] as { fields?: { examples?: { name: string }[] } }).fields?.examples?.map(
                (each) => each.name,
            ),
        );

        expect(names).toEqual([
            ['Creado', 'Creado copy'],
            ['Creado', 'New example'],
        ]);
    });

    it('tells that the response was kept', async () => {
        vi.spyOn(window.mandor.collections, 'writeItem').mockResolvedValue(success({}));

        const { result } = renderHook(() => useExampleActions(), { wrapper: Providers });

        await act(async () => {
            await result.current.saveResponse(ITEM, httpResponseWith());
        });

        expect(heard).toHaveLength(1);
        expect(heard[0]).toMatchObject({ title: 'Response saved as an example', tone: 'success' });
    });
});
