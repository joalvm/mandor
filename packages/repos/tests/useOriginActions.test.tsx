import { MessagesProvider } from '@mandor/i18n';
import { success } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { createOrigin } from '@mandor/schema';
import { ToastProvider } from '@mandor/ui';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bridge } from '@mandor/shell';
import { useOriginActions } from '../src/hooks/useOriginActions.js';

const fakeBridge = bridge as FakeBridge;
const TEAM = createOrigin({ id: 'team', name: 'Team', url: 'https://github.com/team/api.git' });

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <ToastProvider
                messages={{ close: 'Close', more: (count: number) => `${String(count)} more` }}
            >
                {children}
            </ToastProvider>
        </MessagesProvider>
    );
}

function hookOf(
    activeOriginId: string | null,
    onSwitch: (id: string) => void,
    refresh: () => void,
) {
    return renderHook(() => useOriginActions({ activeOriginId, onSwitch, refresh }), {
        wrapper: Wrapper,
    });
}

describe('useOriginActions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renames through the channel with the trimmed name, and reads the list again', async () => {
        const refresh = vi.fn();
        const rename = vi.spyOn(fakeBridge.origin, 'rename').mockResolvedValue(success(TEAM));
        const hook = hookOf('local', vi.fn(), refresh);

        let accepted = false;

        act(() => {
            accepted = hook.result.current.actions.rename(TEAM, ' Equipo ');
        });

        expect(accepted).toBe(true);

        await waitFor(() => {
            expect(refresh).toHaveBeenCalled();
        });
        expect(rename).toHaveBeenCalledWith({ id: TEAM.id, name: 'Equipo' });
    });

    it('refuses an empty name without asking anything', () => {
        const rename = vi.spyOn(fakeBridge.origin, 'rename');
        const hook = hookOf('local', vi.fn(), vi.fn());

        let accepted = true;

        act(() => {
            accepted = hook.result.current.actions.rename(TEAM, '   ');
        });

        expect(accepted).toBe(false);
        expect(rename).not.toHaveBeenCalled();
    });

    it('empties an origin through the channel, and reads the list again', async () => {
        const refresh = vi.fn();
        const empty = vi.spyOn(fakeBridge.origin, 'empty').mockResolvedValue(success({}));
        const hook = hookOf('local', vi.fn(), refresh);

        act(() => {
            hook.result.current.actions.confirmEmpty(TEAM);
        });

        await waitFor(() => {
            expect(refresh).toHaveBeenCalled();
        });
        expect(empty).toHaveBeenCalledWith({ id: TEAM.id });
    });

    it('goes back to the local origin when the one in use is removed', async () => {
        const onSwitch = vi.fn();
        const remove = vi.spyOn(fakeBridge.origin, 'remove').mockResolvedValue(success({}));
        const hook = hookOf(TEAM.id, onSwitch, vi.fn());

        act(() => {
            hook.result.current.actions.confirmRemove(TEAM);
        });

        await waitFor(() => {
            expect(onSwitch).toHaveBeenCalledWith('local');
        });
        expect(remove).toHaveBeenCalledWith({ id: TEAM.id });
    });
});
