import { describe, expect, it, vi } from 'vitest';

import { writeInRepo } from '../../src/repo/write-in-repo.js';
import { holdQuitForSession } from '../../src/runtime/hold-quit-for-session.js';
import { tempRepo } from '../repo/support/temp-repo.js';

type WillQuit = (event: { preventDefault: () => void }) => void;

const electron = vi.hoisted(() => ({
    listeners: [] as WillQuit[],
    exited: undefined as (() => void) | undefined,
    exits: 0,
}));

vi.mock('electron', () => ({
    app: {
        on: (_name: string, listener: WillQuit) => electron.listeners.push(listener),
        exit: () => {
            electron.exits += 1;
            electron.exited?.();
        },
    },
}));

const repo = tempRepo();

describe('holding the quit for the session', () => {
    /** Closing is the end of the calm: the edit that waits for it is committed before the exit. */
    it('commits what still waits for its calm before the process exits', async () => {
        const exited = new Promise<void>((resolve) => {
            electron.exited = resolve;
        });
        const prevented = vi.fn();

        holdQuitForSession();
        await writeInRepo(
            { root: repo.root(), path: 'a.yaml', change: { kind: 'update-item', name: 'a' } },
            () => repo.write('a.yaml', 'one\n'),
        );

        electron.listeners[0]?.({ preventDefault: prevented });
        await exited;

        expect(prevented).toHaveBeenCalledOnce();
        expect(await repo.subjects()).toEqual(['update item a', 'init repo']);
        expect(await repo.dirty()).toBe('');
    });

    it('starts the installer of a waiting version, and then ends the process itself', async () => {
        const order: string[] = [];
        const exited = new Promise<void>((resolve) => {
            electron.exited = () => {
                order.push('exited');
                resolve();
            };
        });

        holdQuitForSession(() => {
            order.push('installed');
        });
        electron.listeners.at(-1)?.({ preventDefault: vi.fn() });
        await exited;

        expect(order).toEqual(['installed', 'exited']);
    });
});
