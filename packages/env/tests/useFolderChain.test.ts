import type { FakeBridge } from '@mandor/ipc/testing';
import { success } from '@mandor/ipc';
import type { FolderChainLevel } from '@mandor/schema';
import { bridge } from '@mandor/shell';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useFolderChain } from '../src/hooks/useFolderChain.js';

function chainWith(value: string): FolderChainLevel[] {
    return [
        {
            level: 'folder',
            place: { kind: 'folder', path: 'pagos/altas' },
            name: 'Altas',
            settings: { variables: [{ name: 'level', value, enabled: true, secret: false }] },
        },
        { level: 'workspace', place: { kind: 'workspace' }, name: 'API', settings: {} },
    ];
}

describe('useFolderChain', () => {
    it('reads the chain of a place once, for every field that asks', async () => {
        const read = vi
            .spyOn(bridge.collections, 'chain')
            .mockResolvedValue(success(chainWith('uno')));
        const first = renderHook(() => useFolderChain('payments', 'pagos/altas'));
        const second = renderHook(() => useFolderChain('payments', 'pagos/altas'));

        await waitFor(() => {
            expect(first.result.current[0]?.name).toBe('Altas');
        });

        expect(second.result.current).toBe(first.result.current);
        expect(read).toHaveBeenCalledTimes(1);
        expect(read).toHaveBeenCalledWith({ workspaceId: 'payments', parentPath: 'pagos/altas' });
    });

    it('reads it again when the collections change on disk without the window', async () => {
        const read = vi
            .spyOn(bridge.collections, 'chain')
            .mockResolvedValueOnce(success(chainWith('uno')))
            .mockResolvedValueOnce(success(chainWith('dos')));
        const { result } = renderHook(() => useFolderChain('payments', 'pagos/altas'));

        await waitFor(() => {
            expect(result.current[0]?.settings.variables?.[0]?.value).toBe('uno');
        });

        act(() => {
            (bridge as FakeBridge).emitRepoChanged({
                changes: [{ area: 'collections', workspaceId: 'payments', path: 'pagos/altas' }],
            });
        });

        await waitFor(() => {
            expect(result.current[0]?.settings.variables?.[0]?.value).toBe('dos');
        });
        expect(read).toHaveBeenCalledTimes(2);
    });

    it('reads nothing without a workspace', () => {
        const read = vi.spyOn(bridge.collections, 'chain');
        const { result } = renderHook(() => useFolderChain(null, 'pagos'));

        expect(result.current).toEqual([]);
        expect(read).not.toHaveBeenCalled();
    });
});
