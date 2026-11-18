import { success } from '@mandor/ipc';
import { bridge, selectTabs, shellStore } from '@mandor/shell';
import { act, cleanup, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { docsStore } from '../src/docs-store.js';
import { useDocLinks } from '../src/hooks/useDocLinks.js';

import { AppProviders } from './support/app-providers.js';

beforeEach(() => {
    vi.restoreAllMocks();
    shellStore.getState().reset();
    docsStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    vi.spyOn(bridge.doc, 'list').mockResolvedValue(
        success([
            { name: 'readme.md', title: 'readme' },
            { name: 'd1a2.md', title: 'Guía de inicio' },
        ]),
    );
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();
    shellStore.getState().reset();
});

function following() {
    return renderHook(() => useDocLinks(), { wrapper: AppProviders }).result;
}

describe('following the links of the doc being read', () => {
    it('opens the doc a link names by its title', async () => {
        const follow = following();

        await act(() => {
            follow.current('Guía de inicio', false);

            return Promise.resolve();
        });

        await waitFor(() => {
            expect(selectTabs(shellStore.getState()).map((tab) => tab.resource)).toEqual([
                'mandor://local-apis/events/doc/d1a2.md',
            ]);
        });
    });

    it('opens a doc of the workspace a link names by its resource', async () => {
        const follow = following();

        await act(() => {
            follow.current('mandor://local-apis/events/doc/readme.md', false);

            return Promise.resolve();
        });

        await waitFor(() => {
            expect(selectTabs(shellStore.getState()).map((tab) => tab.resource)).toEqual([
                'mandor://local-apis/events/doc/readme.md',
            ]);
        });
    });

    /** The line of the doc that went stale is what the message hands back to whoever wrote it. */
    it('tells the reader what it found, with the link under it, when a link is stale', async () => {
        const follow = following();
        const stale = 'mandor://local-apis/events/doc/falta.md';

        await act(() => {
            follow.current(stale, false);

            return Promise.resolve();
        });

        expect(await screen.findByText('Mandor found nothing at that link.')).toBeVisible();
        expect(screen.getByText(stale)).toBeVisible();
        expect(selectTabs(shellStore.getState())).toEqual([]);
    });

    it('tells the reader nothing when the link was followed', async () => {
        const follow = following();

        await act(() => {
            follow.current('Guía de inicio', false);

            return Promise.resolve();
        });

        await waitFor(() => {
            expect(selectTabs(shellStore.getState())).toHaveLength(1);
        });

        expect(screen.queryByText('Mandor found nothing at that link.')).toBeNull();
    });

    it('is the same function while nothing it depends on changes', () => {
        const { result, rerender } = renderHook(() => useDocLinks(), { wrapper: AppProviders });
        const first = result.current;

        rerender();

        expect(result.current).toBe(first);
    });
});
