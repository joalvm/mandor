import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { batchPaths } from '../../src/disk/batch-paths.js';
import type { WatchedPath } from '../../src/disk/watched-path.js';

/** Fake timers own the clock here, so the length of the window is a detail, not a bet. */
const WINDOW = 50;

let batches: WatchedPath[][];

/** What a plain write looks like once batched, which is what most of these cases are about. */
function written(...paths: string[]): WatchedPath[] {
    return paths.map((path) => ({ path, renamed: false }));
}

beforeEach(() => {
    vi.useFakeTimers();
    batches = [];
});

afterEach(() => {
    vi.useRealTimers();
});

describe('batching paths', () => {
    it('hands over a burst of paths as a single batch', () => {
        const batch = batchPaths(WINDOW, (paths) => batches.push(paths));
        const names = Array.from({ length: 10 }, (_value, index) => `w${String(index)}.yaml`);

        for (const name of names) {
            batch.add(name, false);
        }

        vi.advanceTimersByTime(WINDOW);

        expect(batches).toEqual([written(...names)]);
    });

    it('hands over nothing until the window closes', () => {
        const batch = batchPaths(WINDOW, (paths) => batches.push(paths));

        batch.add('mandor.yaml', false);
        vi.advanceTimersByTime(WINDOW - 1);

        expect(batches).toEqual([]);

        vi.advanceTimersByTime(1);

        expect(batches).toEqual([written('mandor.yaml')]);
    });

    /** One save fires several events for the same file, and the listener wants one path. */
    it('names a path once however many times it was added', () => {
        const batch = batchPaths(WINDOW, (paths) => batches.push(paths));

        batch.add('mandor.yaml', false);
        batch.add('mandor.yaml', false);
        batch.add('mandor.yaml', false);
        vi.advanceTimersByTime(WINDOW);

        expect(batches).toEqual([written('mandor.yaml')]);
    });

    /**
     * A rename is followed by writes to the name that arrived. The batch has to remember the
     * rename through them, because that is the half of the pair that says what happened.
     */
    it('keeps a path renamed once it has been renamed, whatever comes after', () => {
        const batch = batchPaths(WINDOW, (paths) => batches.push(paths));

        batch.add('nuevo.yaml', true);
        batch.add('nuevo.yaml', false);
        batch.add('viejo.yaml', false);
        batch.add('viejo.yaml', true);
        vi.advanceTimersByTime(WINDOW);

        expect(batches).toEqual([
            [
                { path: 'nuevo.yaml', renamed: true },
                { path: 'viejo.yaml', renamed: true },
            ],
        ]);
    });

    it('sorts the paths of a batch', () => {
        const batch = batchPaths(WINDOW, (paths) => batches.push(paths));

        batch.add('workspaces/b.yaml', false);
        batch.add('mandor.yaml', false);
        vi.advanceTimersByTime(WINDOW);

        expect(batches).toEqual([written('mandor.yaml', 'workspaces/b.yaml')]);
    });

    /** The window never extends: a repo that changes non-stop still reports as it goes. */
    it('measures the window from its first path, not from its last', () => {
        const batch = batchPaths(WINDOW, (paths) => batches.push(paths));

        batch.add('mandor.yaml', false);
        vi.advanceTimersByTime(WINDOW - 1);
        batch.add('workspaces/b.yaml', false);
        vi.advanceTimersByTime(1);

        expect(batches).toEqual([written('mandor.yaml', 'workspaces/b.yaml')]);
    });

    it('opens a new window for what changes after a batch', () => {
        const batch = batchPaths(WINDOW, (paths) => batches.push(paths));

        batch.add('mandor.yaml', false);
        vi.advanceTimersByTime(WINDOW);
        batch.add('workspaces/b.yaml', false);
        vi.advanceTimersByTime(WINDOW);

        expect(batches).toEqual([written('mandor.yaml'), written('workspaces/b.yaml')]);
    });

    /** A batch still forming when the app closes must not fire against a dead listener. */
    it('drops what was pending when it is disposed', () => {
        const batch = batchPaths(WINDOW, (paths) => batches.push(paths));

        batch.add('mandor.yaml', false);
        batch.dispose();
        vi.advanceTimersByTime(WINDOW * 4);

        expect(batches).toEqual([]);
    });
});
