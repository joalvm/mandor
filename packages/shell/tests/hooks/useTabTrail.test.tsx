import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useTabTrail } from '../../src/hooks/useTabTrail.js';
import { tabKindOf } from '../../src/tab/tab-kind-registry.js';
import { declareTabKindSpec } from '../../src/testing/tab-kind.js';

const RESOURCE = 'mandor://demo/payments/item/pedidos/crear';
const UNREGISTER: (() => void)[] = [];

afterEach(() => {
    // The window goes first: letting go of a kind under a mounted hook is an update outside act.
    cleanup();

    for (const unregister of UNREGISTER.splice(0)) {
        unregister();
    }
});

describe('the trail of a tab', () => {
    it('is the names its kind says, outermost first, with a slash between them', () => {
        UNREGISTER.push(
            declareTabKindSpec({
                closable: true,
                icon: 'file',
                id: 'item',
                title: () => 'Crear',
                trail: () => ['Tienda', 'Pedidos'],
            }),
        );

        const { result } = renderHook(() => useTabTrail(tabKindOf('item'), RESOURCE));

        expect(result.current).toBe('Tienda / Pedidos');
    });

    it('is empty when its kind names nothing that holds the resource', () => {
        UNREGISTER.push(
            declareTabKindSpec({ closable: true, icon: 'file', id: 'bare', title: () => 'Solo' }),
        );

        const { result } = renderHook(() => useTabTrail(tabKindOf('bare'), RESOURCE));

        expect(result.current).toBe('');
    });

    it('reads again when its kind says the names moved, and stops listening when it goes', () => {
        const stop = vi.fn();
        let announce = (): void => undefined;
        let holders = ['Tienda'];

        UNREGISTER.push(
            declareTabKindSpec({
                closable: true,
                icon: 'file',
                id: 'moving',
                subscribeTitles: (onChange) => {
                    announce = onChange;

                    return stop;
                },
                title: () => 'Crear',
                trail: () => holders,
            }),
        );

        const { result, unmount } = renderHook(() => useTabTrail(tabKindOf('moving'), RESOURCE));

        expect(result.current).toBe('Tienda');

        holders = ['Tienda', 'Pedidos'];
        act(() => {
            announce();
        });

        expect(result.current).toBe('Tienda / Pedidos');

        unmount();

        expect(stop).toHaveBeenCalledTimes(1);
    });
});
