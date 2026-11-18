import { failure, success, type ConflictSummary, type Result } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { bridge, shellStore } from '@mandor/shell';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useConflictFeed } from '../src/hooks/useConflictFeed.js';

const GUIDE: ConflictSummary = {
    at: '2026-10-07T10:00:00.000Z',
    entity: { area: 'doc', name: 'guia.md', workspaceId: 'payments' },
    id: 'aaaaaaaaaaaaaaaa',
    name: 'guia.md',
    sections: [],
    source: 'merge',
};
const USERS: ConflictSummary = { ...GUIDE, id: 'bbbbbbbbbbbbbbbb', name: 'users' };

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    shellStore.getState().reset();
});

function open(originId: string | null): void {
    act(() => {
        shellStore.setState({ activeOriginId: originId });
    });
}

describe('the list of clashes the window keeps (useConflictFeed)', () => {
    it('asks main for the clashes once an origin is open', async () => {
        vi.spyOn(bridge.conflict, 'list').mockResolvedValue(success([GUIDE]));
        renderHook(() => {
            useConflictFeed();
        });

        open('team');

        await waitFor(() => {
            expect(shellStore.getState().conflicts).toEqual([GUIDE]);
        });
    });

    it('asks again every time main says the list changed', async () => {
        const list = vi
            .spyOn(bridge.conflict, 'list')
            .mockResolvedValueOnce(success([GUIDE]))
            .mockResolvedValueOnce(success([GUIDE, USERS]));

        renderHook(() => {
            useConflictFeed();
        });
        open('team');
        await waitFor(() => {
            expect(shellStore.getState().conflicts).toEqual([GUIDE]);
        });
        act(() => {
            (bridge as FakeBridge).emitConflictChanged({});
        });

        await waitFor(() => {
            expect(shellStore.getState().conflicts).toEqual([GUIDE, USERS]);
        });
        expect(list).toHaveBeenCalledTimes(2);
    });

    it('hears only the newest answer when two come out of order', async () => {
        const answers: ((value: Result<ConflictSummary[]>) => void)[] = [];

        vi.spyOn(bridge.conflict, 'list').mockImplementation(
            () =>
                new Promise((resolve) => {
                    answers.push(resolve);
                }),
        );
        renderHook(() => {
            useConflictFeed();
        });
        open('team');
        act(() => {
            (bridge as FakeBridge).emitConflictChanged({});
        });
        await act(async () => {
            answers[1]?.(success([USERS]));
            answers[0]?.(success([GUIDE]));
            await Promise.resolve();
        });

        expect(shellStore.getState().conflicts).toEqual([USERS]);
    });

    it('keeps the list when main cannot answer', async () => {
        shellStore.getState().setConflicts([GUIDE]);
        vi.spyOn(bridge.conflict, 'list').mockResolvedValue(failure('unknown', 'x'));
        renderHook(() => {
            useConflictFeed();
        });
        open('team');
        await act(async () => {
            await Promise.resolve();
        });

        expect(shellStore.getState().conflicts).toEqual([GUIDE]);
    });

    it('asks nothing while no origin is open, and stops listening when the window goes', () => {
        const list = vi.spyOn(bridge.conflict, 'list');
        const { unmount } = renderHook(() => {
            useConflictFeed();
        });

        act(() => {
            (bridge as FakeBridge).emitConflictChanged({});
        });

        expect(list).not.toHaveBeenCalled();

        open('team');
        unmount();
        list.mockClear();
        act(() => {
            (bridge as FakeBridge).emitConflictChanged({});
        });

        expect(list).not.toHaveBeenCalled();
    });
});
