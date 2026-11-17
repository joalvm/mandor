import { success, type LogWriteRequest } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { fireAndForget } from '../src/fire-and-forget.js';

type Mandor = { mandor: FakeBridge };

let written: LogWriteRequest[];

beforeEach(() => {
    written = [];
    (window as unknown as Mandor).mandor.log.write = (input) => {
        written.push(input);

        return Promise.resolve(success({}));
    };
});

describe('a request nobody waits for', () => {
    /** A rejection here is a preload fault: it must reach the log, not the window as a loose one. */
    it('writes a rejection in the log instead of leaving it loose', async () => {
        const loose: unknown[] = [];
        const listen = (reason: unknown): void => {
            loose.push(reason);
        };

        process.on('unhandledRejection', listen);

        try {
            fireAndForget(Promise.reject(new Error('el puente no respondió')));
            await new Promise((settle) => setTimeout(settle, 0));
        } finally {
            process.off('unhandledRejection', listen);
        }

        expect(loose).toEqual([]);
        expect(written).toMatchObject([
            { source: 'unawaited', message: 'el puente no respondió', level: 'error' },
        ]);
    });

    it('lets a request that answers answer, and writes nothing', async () => {
        let answered = false;

        fireAndForget(
            Promise.resolve().then(() => {
                answered = true;
            }),
        );
        await Promise.resolve();

        expect(answered).toBe(true);
        expect(written).toEqual([]);
    });

    it('has nothing to let go of when the target is not there', () => {
        fireAndForget(undefined);

        expect(written).toEqual([]);
    });
});
