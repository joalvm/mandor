import { describe, expect, it } from 'vitest';

import { inTurn } from '../../src/index.js';

/** A piece of work that reads, gives way to whatever else is pending, then writes. */
function readThenWrite(store: string[], value: string): () => Promise<void> {
    return async () => {
        const read = [...store];

        await new Promise<void>((resolve) => {
            setImmediate(resolve);
        });
        store.splice(0, store.length, ...read, value);
    };
}

describe('work in turn by key', () => {
    it('runs the work of one key one after the other, so no update is lost', async () => {
        const store: string[] = [];

        await Promise.all(
            ['a', 'b', 'c'].map((value) => inTurn('file', readThenWrite(store, value))),
        );

        expect(store).toEqual(['a', 'b', 'c']);
    });

    it('lets the next work run after one that failed, and hands each its own outcome', async () => {
        const failed = inTurn('file', () => Promise.reject(new Error('disk full')));
        const next = inTurn('file', () => Promise.resolve('written'));

        await expect(failed).rejects.toThrow('disk full');
        await expect(next).resolves.toBe('written');
    });

    it('does not make the work of another key wait', async () => {
        let release: () => void = () => undefined;
        const held = inTurn(
            'one',
            () =>
                new Promise<void>((resolve) => {
                    release = resolve;
                }),
        );

        await expect(inTurn('two', () => Promise.resolve('free'))).resolves.toBe('free');

        release();
        await held;
    });
});
