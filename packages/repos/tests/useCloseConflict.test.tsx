import { failure, success, type Empty, type Result } from '@mandor/ipc';
import {
    bridge,
    conflictResource,
    conflictTabId,
    selectGroupOfTab,
    shellStore,
} from '@mandor/shell';
import { act, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCloseConflict } from '../src/hooks/useCloseConflict.js';
import { forgetDrafts, Wrapper } from './support/conflict-fixtures.js';

const ID = 'aaaaaaaaaaaaaaaa';
const TAB = conflictTabId(ID);
const CHOICES = { method: { pick: 'theirs' } } as const;

beforeEach(() => {
    forgetDrafts();
    shellStore.getState().reset();

    const shell = shellStore.getState();

    shell.openTab(shell.activeGroupId, {
        id: TAB,
        kind: 'conflict',
        resource: conflictResource('team', 'payments', ID),
    });
});

afterEach(() => {
    vi.restoreAllMocks();
    shellStore.getState().reset();
});

function opened(): boolean {
    return selectGroupOfTab(shellStore.getState(), TAB) !== null;
}

function hook() {
    return renderHook(() => useCloseConflict(ID, TAB, CHOICES), { wrapper: Wrapper });
}

describe('the two ways out of a clash (useCloseConflict)', () => {
    it('writes the answers, says so and closes the tab without asking', async () => {
        const resolve = vi.spyOn(bridge.conflict, 'resolve').mockResolvedValue(success({}));
        const { result } = hook();

        act(() => {
            result.current.resolve();
        });

        expect(await screen.findByText('Conflict resolved')).toBeInTheDocument();
        expect(resolve).toHaveBeenCalledWith({ choices: CHOICES, id: ID });
        expect(opened()).toBe(false);
        expect(result.current.busy).toBe(false);
    });

    it('keeps this copy and closes the tab the same way', async () => {
        const keepMine = vi.spyOn(bridge.conflict, 'keepMine').mockResolvedValue(success({}));
        const { result } = hook();

        act(() => {
            result.current.keepMine();
        });

        await waitFor(() => {
            expect(opened()).toBe(false);
        });
        expect(keepMine).toHaveBeenCalledWith({ id: ID });
        expect(screen.getByText('Conflict resolved')).toBeInTheDocument();
    });

    it('is busy while main answers', async () => {
        let answer: (value: Result<Empty>) => void = () => undefined;

        vi.spyOn(bridge.conflict, 'resolve').mockReturnValue(
            new Promise((resolve) => {
                answer = resolve;
            }),
        );

        const { result } = hook();

        act(() => {
            result.current.resolve();
        });

        expect(result.current.busy).toBe(true);

        await act(async () => {
            answer(success({}));
            await Promise.resolve();
        });

        expect(result.current.busy).toBe(false);
    });

    it('says why in the toast and leaves the tab open when main refuses', async () => {
        vi.spyOn(bridge.conflict, 'resolve').mockResolvedValue(
            failure('conflict-open', 'questions left'),
        );

        const { result } = hook();

        act(() => {
            result.current.resolve();
        });

        expect(await screen.findByText(/still have no choice/)).toBeInTheDocument();
        expect(opened()).toBe(true);
        expect(result.current.busy).toBe(false);
    });
});
