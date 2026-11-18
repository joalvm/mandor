import { MessagesProvider } from '@mandor/i18n';
import { success, type UiSession } from '@mandor/ipc';
import { TooltipProvider } from '@mandor/ui';
import { act, cleanup, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GroupGrid, shellStore, useTab } from '../../../src/index.js';
import { declareTabKindSpec } from '../../../src/testing/tab-kind.js';

function ShownTabId() {
    return <div>{useTab().tabId}</div>;
}

const UNREGISTER: (() => void)[] = [];
const ORIGIN = 'local';

function tab(id: string) {
    return { id, kind: 'doc', resource: `mandor://demo/payments/doc/${id}.md` };
}

/** What the last window wrote down: two groups, and the one on the right is where the work was. */
const SESSION: UiSession = {
    version: 2,
    activeWorkspaceId: 'payments',
    activeGroupId: 'right',
    grid: {
        kind: 'branch',
        axis: 'row',
        sizes: [50, 50],
        children: [
            { kind: 'leaf', id: 'root', tabs: [tab('one'), tab('two')], activeTab: 'two' },
            { kind: 'leaf', id: 'right', tabs: [tab('three')], activeTab: 'three' },
        ],
    },
    panels: { sidebarWidth: 260, contentSplit: 50, collapsedSections: [], splits: {} },
};

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

function shownTabs(): Record<string, string | null> {
    const { grid } = shellStore.getState();
    const leaves = grid.kind === 'branch' ? grid.children : [grid];

    return Object.fromEntries(
        leaves.map((leaf) => [
            leaf.kind === 'leaf' ? leaf.id : '',
            leaf.kind === 'leaf' ? leaf.activeTab : null,
        ]),
    );
}

afterEach(() => {
    // The window comes down before its kinds do: a tab left drawn over a kind that is no
    // longer registered has nothing to render itself with.
    cleanup();

    for (const off of UNREGISTER.splice(0)) {
        off();
    }

    vi.restoreAllMocks();
    shellStore.getState().reset();
});

describe('a window drawn from a restored session', () => {
    it('keeps the group and the tabs the session left in front', async () => {
        UNREGISTER.push(
            declareTabKindSpec({
                closable: true,
                icon: 'connection',
                id: 'doc',
                body: <ShownTabId />,
                title: (resource) => resource,
            }),
        );

        vi.spyOn(window.mandor.session, 'load').mockResolvedValue(success(SESSION));

        await act(async () => {
            await shellStore.getState().loadSession(ORIGIN);
        });
        render(<GroupGrid />, { wrapper: Wrapper });
        await act(async () => {
            await Promise.resolve();
        });

        expect(shownTabs()).toEqual({ root: 'two', right: 'three' });
        expect(shellStore.getState().activeGroupId).toBe('right');
    });
});
