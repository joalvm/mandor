import { MessagesProvider } from '@mandor/i18n';
import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useTrailingAction } from '../../../src/components/group-grid/useTrailingAction.js';
import { GroupGridContext } from '../../../src/grid/group-grid-scope.js';
import { shellStore } from '../../../src/index.js';

const TAB = { id: 'notes', kind: 'doc', resource: 'mandor://demo/payments/doc/notes.md' };

function trailing(of: { closable: boolean; pinned: boolean }, onCloseTab = vi.fn()) {
    function Scope({ children }: { children: ReactNode }) {
        return (
            <MessagesProvider preferences={{ language: 'en' }}>
                <GroupGridContext value={{ onCloseTab, resources: {} }}>
                    {children}
                </GroupGridContext>
            </MessagesProvider>
        );
    }

    const { result } = renderHook(
        () => useTrailingAction({ ...of, groupId: ROOT_GROUP_ID, tabId: TAB.id }),
        { wrapper: Scope },
    );

    return { action: result.current, onCloseTab };
}

afterEach(() => {
    shellStore.getState().reset();
});

describe('what stands at the end of a tab', () => {
    it('offers a pinned tab to let go of its pin, and keeps it there at rest', () => {
        shellStore.getState().openTab(ROOT_GROUP_ID, TAB);
        shellStore.getState().pinTab(TAB.id);

        const { action } = trailing({ closable: true, pinned: true });

        action?.run();

        expect([action?.icon, action?.rests]).toEqual(['pinned', true]);
        expect(leavesOf(shellStore.getState().grid)[0]?.tabs[0]?.pinned).not.toBe(true);
    });

    it('offers any other tab its close, only while it is aimed at', () => {
        const { action, onCloseTab } = trailing({ closable: true, pinned: false });

        action?.run();

        expect([action?.icon, action?.rests]).toEqual(['close', false]);
        expect(onCloseTab).toHaveBeenCalledWith(ROOT_GROUP_ID, TAB.id);
    });

    it('offers nothing on a tab whose kind never closes', () => {
        expect(trailing({ closable: false, pinned: false }).action).toBeUndefined();
    });
});
