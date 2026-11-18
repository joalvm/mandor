import { ROOT_GROUP_ID } from '@mandor/ipc';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useKeepTab, useTab } from '../../src/hooks/useTab.js';
import { shellStore } from '../../src/index.js';
import { TabProvider } from '../../src/tab/tab-context.js';

const RESOURCE = 'mandor://demo/payments/collection/a.yaml';

function inTab({ children }: { children: ReactNode }) {
    return <TabProvider value={{ resource: RESOURCE, tabId: 'a' }}>{children}</TabProvider>;
}

function look(): void {
    act(() => {
        shellStore
            .getState()
            .openTab(
                ROOT_GROUP_ID,
                { id: 'a', kind: 'item', resource: RESOURCE },
                { preview: true },
            );
    });
}

describe('the tab a piece is drawn for', () => {
    it('says it is only being looked at, and keeps it when asked', () => {
        look();

        const { result } = renderHook(() => useTab(), { wrapper: inTab });

        expect(result.current.preview).toBe(true);

        act(() => {
            result.current.keep();
        });

        expect(result.current.preview).toBe(false);
    });

    it('hands the same keep on every draw, so an effect can depend on it', () => {
        const { rerender, result } = renderHook(() => useTab(), { wrapper: inTab });
        const first = result.current.keep;

        rerender();

        expect(result.current.keep).toBe(first);
    });
});

describe('keeping from a piece that may not be in a tab', () => {
    it('keeps the tab it is drawn in', () => {
        look();

        const { result } = renderHook(() => useKeepTab(), { wrapper: inTab });

        act(() => {
            result.current();
        });

        expect(shellStore.getState().grid).toMatchObject({ tabs: [{ id: 'a' }] });
        expect(JSON.stringify(shellStore.getState().grid)).not.toContain('preview');
    });

    it('does nothing outside a tab', () => {
        look();

        const before = shellStore.getState().grid;
        const { result } = renderHook(() => useKeepTab());

        act(() => {
            result.current();
        });

        expect(shellStore.getState().grid).toBe(before);
    });
});
