import { GroupGrid, shellStore, tabKind, useStatusItems, windowSurface } from '@mandor/shell';
import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { SyncTabKinds } from '../../../src/renderer/app/SyncTabKinds.js';
import { AppProviders } from '../support/app-providers.js';

let unregister: (() => void) | undefined;

afterEach(() => {
    unregister?.();
    unregister = undefined;
    shellStore.getState().reset();
});

describe('the sync tab kinds', () => {
    it('registers the shared kinds, and none for environments', () => {
        unregister = render(<SyncTabKinds />, { wrapper: AppProviders }).unmount;

        expect(tabKind('doc')).toBeDefined();
        expect(tabKind('conflict')).toBeDefined();
        expect(tabKind('settings')).toBeUndefined();
        expect(tabKind('environment')).toBeUndefined();
        expect(windowSurface('settings')).toBeDefined();
    });

    /** What the window says about the updates is shared, so both apps hang it the same way. */
    it('hangs the update in the status line, and takes it down with the rest', () => {
        const stop = render(<SyncTabKinds />, { wrapper: AppProviders }).unmount;
        const items = renderHook(() => useStatusItems());

        expect(items.result.current.map((item) => item.id)).toContain('update');

        act(() => {
            stop();
        });

        expect(items.result.current.map((item) => item.id)).not.toContain('update');
    });

    it('says what a group with no tab in it shows', () => {
        unregister = render(
            <>
                <SyncTabKinds />
                <GroupGrid />
            </>,
            { wrapper: AppProviders },
        ).unmount;

        expect(screen.getByText('Select or open an item')).toBeVisible();
    });
});
