import { describe, expect, it } from 'vitest';

import { trackWrite, writesSettled } from '../../src/runtime/write-drain.js';

/** Resolves once the microtask queue has run, which is where a settled promise lands. */
function settled(promise: Promise<void>): Promise<'waiting' | 'done'> {
    return Promise.race([
        promise.then((): 'done' => 'done'),
        Promise.resolve().then((): 'waiting' => 'waiting'),
    ]);
}

describe('the writes of the session', () => {
    it('has nothing to wait for when nothing is being written', async () => {
        await expect(writesSettled()).resolves.toBeUndefined();
    });

    /** Quitting while the file is half written leaves the window unreadable on the way back. */
    it('waits for a write that started and has not landed', async () => {
        let land = (): void => undefined;
        const write = trackWrite(
            new Promise<void>((resolve) => {
                land = resolve;
            }),
        );

        await expect(settled(writesSettled())).resolves.toBe('waiting');

        land();
        await write;

        await expect(writesSettled()).resolves.toBeUndefined();
    });

    /** A write that failed is a write that is over: the exit is not held for a broken disk. */
    it('stops waiting for a write that failed', async () => {
        const write = trackWrite(Promise.reject(new Error('disk is full')));

        await expect(write).rejects.toThrow('disk is full');
        await expect(writesSettled()).resolves.toBeUndefined();
    });
});
