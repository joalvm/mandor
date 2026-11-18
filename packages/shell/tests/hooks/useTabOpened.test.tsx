import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useTabOpened } from '../../src/hooks/useTabOpened.js';
import { shellStore } from '../../src/index.js';
import { TabProvider } from '../../src/tab/tab-context.js';

function inTab({ children }: { children: ReactNode }) {
    return (
        <TabProvider value={{ resource: 'mandor://demo/payments/collection/a.yaml', tabId: 'a' }}>
            {children}
        </TabProvider>
    );
}

afterEach(() => {
    shellStore.getState().reset();
});

describe('the first draw of a tab just born (useTabOpened)', () => {
    it('answers once for its own tab and clears the mark', () => {
        const opened = vi.fn();

        shellStore.setState({ openedTabId: 'a' });
        renderHook(
            () => {
                useTabOpened(opened);
            },
            { wrapper: inTab },
        );

        expect(opened).toHaveBeenCalledOnce();
        expect(shellStore.getState().openedTabId).toBeNull();
    });

    it('stays quiet for a tab born elsewhere, and outside any tab', () => {
        const opened = vi.fn();

        shellStore.setState({ openedTabId: 'b' });
        renderHook(
            () => {
                useTabOpened(opened);
            },
            { wrapper: inTab },
        );
        renderHook(() => {
            useTabOpened(opened);
        });

        expect(opened).not.toHaveBeenCalled();
        expect(shellStore.getState().openedTabId).toBe('b');
    });
});
