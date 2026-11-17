import { failure, success, type OpenedOrigin, type Result } from '@mandor/ipc';
import { createLocalOrigin, createOrigin, createRepo, type Origin } from '@mandor/schema';
import { bridge, shellStore } from '@mandor/shell';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOriginBoot } from '../src/hooks/useOriginBoot.js';

const LOCAL = createLocalOrigin('Local');
const TEAM = createOrigin({ id: 'team', name: 'Team', url: 'https://github.com/team/api.git' });
const OPENED: OpenedOrigin = { repo: createRepo({ name: 'Demo' }), workspaces: [] };

beforeEach(() => {
    vi.restoreAllMocks();
    shellStore.getState().reset();
});

afterEach(() => {
    cleanup();
    shellStore.getState().reset();
});

describe('opening the origin the window starts in', () => {
    it('lists the origins, opens the first one and hands what it holds to the app', async () => {
        const adopt = vi.fn(() => Promise.resolve());
        const open = vi.spyOn(bridge.origin, 'switch').mockResolvedValue(success(OPENED));

        vi.spyOn(bridge.origin, 'list').mockResolvedValue(success([LOCAL, TEAM]));
        renderHook(() => {
            useOriginBoot(adopt);
        });

        await waitFor(() => {
            expect(adopt).toHaveBeenCalledWith(LOCAL.id, OPENED);
        });

        expect(open).toHaveBeenCalledWith({ id: LOCAL.id });
        expect(shellStore.getState().origins).toEqual([LOCAL, TEAM]);
    });

    it('lists the origins and opens nothing when one is already open', async () => {
        const adopt = vi.fn(() => Promise.resolve());
        const open = vi.spyOn(bridge.origin, 'switch').mockResolvedValue(success(OPENED));

        shellStore.setState({ activeOriginId: 'team' });
        vi.spyOn(bridge.origin, 'list').mockResolvedValue(success([LOCAL, TEAM]));
        renderHook(() => {
            useOriginBoot(adopt);
        });

        await waitFor(() => {
            expect(shellStore.getState().origins).toEqual([LOCAL, TEAM]);
        });

        expect(open).not.toHaveBeenCalled();
        expect(adopt).not.toHaveBeenCalled();
    });

    /** Nothing here blocks the window: a failure leaves whatever the app settles on. */
    it('leaves the window as it was when main cannot list the origins', async () => {
        const adopt = vi.fn(() => Promise.resolve());
        const list = vi
            .spyOn(bridge.origin, 'list')
            .mockResolvedValue(failure('fs-read', 'unreadable'));

        renderHook(() => {
            useOriginBoot(adopt);
        });

        await waitFor(() => {
            expect(list).toHaveBeenCalled();
        });

        expect(adopt).not.toHaveBeenCalled();
        expect(shellStore.getState().origins).toEqual([]);
    });

    it('adopts nothing when main refuses to open the origin', async () => {
        const adopt = vi.fn(() => Promise.resolve());
        const open = vi
            .spyOn(bridge.origin, 'switch')
            .mockResolvedValue(failure('fs-read', 'unreadable'));

        vi.spyOn(bridge.origin, 'list').mockResolvedValue(success([LOCAL]));
        renderHook(() => {
            useOriginBoot(adopt);
        });

        await waitFor(() => {
            expect(open).toHaveBeenCalled();
        });

        expect(adopt).not.toHaveBeenCalled();
    });

    /** A window that closed while the list was on its way has nobody to hand the origin to. */
    it('does nothing with an answer that arrives after the window is gone', async () => {
        const adopt = vi.fn(() => Promise.resolve());
        let answer: (result: Result<Origin[]>) => void = () => undefined;

        vi.spyOn(bridge.origin, 'list').mockReturnValue(
            new Promise((resolve) => {
                answer = resolve;
            }),
        );

        const { unmount } = renderHook(() => {
            useOriginBoot(adopt);
        });

        unmount();
        answer(success([LOCAL]));

        // Every step after the list is a microtask: letting a handful go by lets all of them run.
        for (let turn = 0; turn < 5; turn += 1) {
            await Promise.resolve();
        }

        expect(adopt).not.toHaveBeenCalled();
        expect(shellStore.getState().origins).toEqual([]);
    });
});
