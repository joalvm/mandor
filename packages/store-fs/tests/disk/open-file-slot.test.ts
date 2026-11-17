import { describe, expect, it } from 'vitest';

import { MAX_OPEN_FILES, withOpenFileSlot } from '../../src/disk/open-file-slot.js';

type Held = { release: () => void; started: Promise<void> };

/** A piece of work that holds its slot until the test lets it go. */
function held(running: { now: number; most: number }): { held: Held; work: () => Promise<number> } {
    let release: () => void = () => undefined;
    let started: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    const startedAt = new Promise<void>((resolve) => {
        started = resolve;
    });

    async function work(): Promise<number> {
        running.now += 1;
        running.most = Math.max(running.most, running.now);
        started();
        await gate;
        running.now -= 1;

        return running.most;
    }

    return { held: { release, started: startedAt }, work };
}

/**
 * A folder of thousands of items read at once opened every file before reading any: past the
 * limit of the system (256 on macOS, 1024 on most Linux desktops) the rest failed with EMFILE and
 * left the tree as unreadable items.
 */
describe('the files main holds open at once', () => {
    it('lets no more than the cap run at once and runs every one in the end', async () => {
        const running = { now: 0, most: 0 };
        const pieces = Array.from({ length: MAX_OPEN_FILES * 3 }, () => held(running));
        const results = pieces.map((piece) => withOpenFileSlot(piece.work));

        await Promise.all(pieces.slice(0, MAX_OPEN_FILES).map((piece) => piece.held.started));

        expect(running.now).toBe(MAX_OPEN_FILES);

        for (const piece of pieces) {
            piece.held.release();
        }

        await Promise.all(results);

        expect(running.most).toBe(MAX_OPEN_FILES);
        expect(running.now).toBe(0);
    });

    it('gives the slot of a piece that failed to the next one', async () => {
        const failing = Array.from({ length: MAX_OPEN_FILES }, () =>
            withOpenFileSlot(() => Promise.reject(new Error('EACCES'))),
        );
        const after = withOpenFileSlot(() => Promise.resolve('read'));

        await expect(Promise.all(failing)).rejects.toThrow('EACCES');
        expect(await after).toBe('read');
    });
});
