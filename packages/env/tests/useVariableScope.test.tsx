import { success } from '@mandor/ipc';
import { createEnvironment, type FolderChainLevel } from '@mandor/schema';
import { bridge, shellStore } from '@mandor/shell';
import { resolveText } from '@mandor/vars';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useVariableScope } from '../src/hooks/useVariableScope.js';
import { chainKey, reloadFolderChains } from '../src/lib/folder-chains.js';
import { ItemPlaceContext } from '../src/lib/item-place.js';
import { envStore } from '../src/env-store.js';

const ENVIRONMENT = createEnvironment({
    id: 'prod',
    name: 'Prod',
    variables: [{ name: 'level', value: 'entorno', enabled: true, secret: false }],
});

function chainWith(value: string): FolderChainLevel[] {
    return [
        {
            level: 'folder',
            place: { kind: 'folder', path: 'pagos/altas' },
            name: 'Altas',
            settings: { variables: [{ name: 'level', value, enabled: true, secret: false }] },
        },
    ];
}

function underItem(parentPath: string | null) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return <ItemPlaceContext value={parentPath}>{children}</ItemPlaceContext>;
    };
}

describe('useVariableScope', () => {
    it('resolves a field under an item with the chain of its folder', async () => {
        shellStore.setState({ activeWorkspaceId: 'payments' });
        vi.spyOn(bridge.collections, 'chain').mockResolvedValue(success(chainWith('carpeta')));

        const { result } = renderHook(() => useVariableScope(ENVIRONMENT), {
            wrapper: underItem('pagos/altas'),
        });

        await waitFor(() => {
            expect(resolveText('{{level}}', result.current).text).toBe('carpeta');
        });
        expect(envStore.getState().folderChains[chainKey('payments', 'pagos/altas')]).toHaveLength(
            1,
        );
    });

    it('resolves a field under no item with the environment alone', () => {
        shellStore.setState({ activeWorkspaceId: 'payments' });

        const read = vi.spyOn(bridge.collections, 'chain');
        const { result } = renderHook(() => useVariableScope(ENVIRONMENT), {
            wrapper: underItem(null),
        });

        expect(resolveText('{{level}}', result.current).text).toBe('entorno');
        expect(read).not.toHaveBeenCalled();
    });

    it('reads again every chain of the workspace it keeps, and keeps what it had on a refusal', async () => {
        const read = vi
            .spyOn(bridge.collections, 'chain')
            .mockResolvedValueOnce(success(chainWith('uno')))
            .mockResolvedValueOnce({ ok: false, error: { code: 'fs-read', message: 'no' } });

        envStore.setState({
            folderChains: {
                [chainKey('payments', 'pagos/altas')]: [],
                [chainKey('otro', 'pagos')]: [],
            },
        });
        await reloadFolderChains('payments');
        await reloadFolderChains('payments');

        expect(read).toHaveBeenCalledTimes(2);
        expect(envStore.getState().folderChains[chainKey('payments', 'pagos/altas')]).toEqual(
            chainWith('uno'),
        );
    });
});
