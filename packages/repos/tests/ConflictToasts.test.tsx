import { MessagesProvider } from '@mandor/i18n';
import type { FakeBridge } from '@mandor/ipc/testing';
import { bridge, selectTabs, shellStore } from '@mandor/shell';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ConflictToasts } from '../src/index.js';
import { useConflictToast } from '../src/hooks/useConflictToast.js';

function Window() {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <ToastProvider
                    messages={{ close: 'Close', more: (count: number) => `${String(count)} more` }}
                >
                    <ConflictToasts />
                </ToastProvider>
            </TooltipProvider>
        </MessagesProvider>
    );
}

function emit(
    entity: Parameters<FakeBridge['emitConflictRecorded']>[0]['entity'],
    name = '',
): void {
    act(() => {
        (bridge as FakeBridge).emitConflictRecorded({ entity, name });
    });
}

afterEach(() => {
    cleanup();
    shellStore.getState().reset();
});

describe('the notice for a clash main kept', () => {
    it('names the file that clashed by the name main read from it', async () => {
        render(<Window />);

        emit({ area: 'doc', workspaceId: 'events', name: 'a1b2c3d4e5f6.md' }, 'Notas');

        expect(await screen.findByText('Conflict in Notas')).toBeVisible();
        expect(screen.queryByText(/a1b2c3d4e5f6/u)).toBeNull();
    });

    it.each([
        { area: 'workspace', workspaceId: 'pagos' },
        { area: 'collections', workspaceId: 'pagos', path: '' },
        { area: 'collections', workspaceId: 'pagos', path: 'users/get' },
        { area: 'environment', workspaceId: 'pagos', id: 'prod' },
        { area: 'connection', workspaceId: 'pagos', id: 'feed' },
        { area: 'repo' },
    ] as const)(
        'says an unnamed file for %j when main read no name, never its id or path',
        async (entity) => {
            render(<Window />);

            emit(entity);

            expect(await screen.findByText('Conflict in an unnamed file')).toBeVisible();
        },
    );

    it('offers the tab that answers it, once main has listed the clash', async () => {
        const entity = { area: 'collections', path: 'users/get', workspaceId: 'pagos' } as const;

        shellStore.setState({ activeOriginId: 'team' });
        render(<Window />);
        emit(entity);
        act(() => {
            shellStore.getState().setConflicts([
                {
                    at: '2026-10-07T10:00:00.000Z',
                    entity,
                    id: 'aaaaaaaaaaaaaaaa',
                    name: 'get',
                    sections: ['method'],
                    source: 'merge',
                },
            ]);
        });
        fireEvent.click(await screen.findByRole('button', { name: 'Resolve' }));

        expect(selectTabs(shellStore.getState()).map((tab) => tab.id)).toEqual([
            'conflict:aaaaaaaaaaaaaaaa',
        ]);
    });

    it('opens nothing when the clash never came to the list', async () => {
        render(<Window />);
        emit({ area: 'collections', workspaceId: 'pagos', path: 'users/get' });
        fireEvent.click(await screen.findByRole('button', { name: 'Resolve' }));

        expect(selectTabs(shellStore.getState())).toHaveLength(0);
    });

    it('stops listening when the window goes away', () => {
        const { unmount } = render(<Window />);

        unmount();
        emit({ area: 'doc', workspaceId: 'events', name: 'notas.md' }, 'Notas');

        expect(screen.queryByText('Conflict in Notas')).toBeNull();
    });

    it('is the hook that does the listening', () => {
        expect(typeof useConflictToast).toBe('function');
    });
});
