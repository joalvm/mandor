import type { FakeBridge } from '@mandor/ipc/testing';
import { describe, expect, it } from 'vitest';

import { listenRepoChanges } from '../../src/repo/repo-change-feed.js';

type Mandor = { mandor: FakeBridge };

function bridge(): FakeBridge {
    return (window as unknown as Mandor).mandor;
}

const ONE = { changes: [{ area: 'repo' as const }] };

describe('the feed of what changed on disk', () => {
    it('hands every listener the same push', () => {
        const first: unknown[] = [];
        const second: unknown[] = [];
        const stopFirst = listenRepoChanges((changes) => first.push(changes));
        const stopSecond = listenRepoChanges((changes) => second.push(changes));

        bridge().emitRepoChanged(ONE);
        stopFirst();
        stopSecond();

        expect(first).toEqual([ONE.changes]);
        expect(second).toEqual([ONE.changes]);
    });

    it('lets one listener go without silencing the others', () => {
        const kept: unknown[] = [];
        const gone: unknown[] = [];
        const stopKept = listenRepoChanges((changes) => kept.push(changes));
        const stopGone = listenRepoChanges((changes) => gone.push(changes));

        stopGone();
        bridge().emitRepoChanged(ONE);
        stopKept();

        expect(kept).toHaveLength(1);
        expect(gone).toEqual([]);
    });

    it('holds one subscription of the bridge while someone listens and none after', () => {
        let subscribed = 0;
        let released = 0;
        const real = bridge().repo.onChanged;

        bridge().repo.onChanged = (handler) => {
            subscribed += 1;

            const stop = real(handler);

            return () => {
                released += 1;
                stop();
            };
        };

        const stopA = listenRepoChanges(() => undefined);
        const stopB = listenRepoChanges(() => undefined);

        stopA();
        stopB();
        bridge().repo.onChanged = real;

        expect([subscribed, released]).toEqual([1, 1]);
    });

    it('subscribes again for the next listener after the last one left', () => {
        const heard: unknown[] = [];

        listenRepoChanges(() => undefined)();

        const stop = listenRepoChanges((changes) => heard.push(changes));

        bridge().emitRepoChanged(ONE);
        stop();

        expect(heard).toEqual([ONE.changes]);
    });
});
