import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { measureStart, type WaitUntil } from './measure-start.js';

type Session = {
    detach: () => Promise<void>;
    send: (method: string) => Promise<unknown>;
};

type FakePage = {
    context: () => { newCDPSession: (page: FakePage) => Promise<Session> };
    evaluate: (script: string) => Promise<unknown>;
    mouse: { move: (x: number, y: number) => Promise<void> };
};

const ANSWERS: Record<string, unknown> = {
    'Memory.getDOMCounters': { documents: 1, jsEventListeners: 10, nodes: 500 },
    'Runtime.getHeapUsage': { totalSize: 0, usedSize: 8 * 1024 * 1024 },
};

const page: FakePage = {
    context: () => ({
        newCDPSession: () =>
            Promise.resolve({
                detach: () => Promise.resolve(),
                send: (method) => Promise.resolve(ANSWERS[method] ?? {}),
            }),
    }),
    evaluate: () => Promise.resolve(true),
    mouse: { move: () => Promise.resolve() },
};

/** Asks again until the answer is true, the way the runner does, with a ceiling. */
const until: WaitUntil = async (ready) => {
    for (let round = 0; round < 5; round += 1) {
        if (await ready()) {
            return;
        }
    }

    throw new Error('never ready');
};

let dir: string;
let closed: number;

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mandor-measure-start-'));
    closed = 0;
});

afterEach(async () => {
    await rm(dir, { force: true, recursive: true });
});

function opened(log: string) {
    return () =>
        writeFile(join(dir, 'mandor.log'), log).then(() => ({
            app: {
                close: () => {
                    closed += 1;

                    return Promise.resolve();
                },
                evaluate: () =>
                    Promise.resolve({
                        heapUsed: 3 * 1024 * 1024,
                        metrics: [{ memory: { workingSetSize: 2048 }, type: 'Tab' }],
                    }),
            },
            page,
        }));
}

describe('one measured start', () => {
    it('tells when the window was ready and the memory it rests at, and closes the app', async () => {
        const log = '2026-10-08T10:00:00.000Z info startup host-start=10 window-ready=850\n';

        const measure = await measureStart(dir, opened(log), until);

        expect(measure.windowReadyMs).toBe(850);
        expect(measure.memory).toMatchObject({
            domNodes: 500,
            heapUsedMb: 8,
            mainHeapUsedMb: 3,
            workingSetMb: 2,
        });
        expect(closed).toBe(1);
    });

    it('forgets the log of an earlier start before it opens the app', async () => {
        await writeFile(join(dir, 'mandor.log'), 'old line\n');

        await measureStart(
            dir,
            opened('2026-10-08T10:00:00.000Z info startup host-start=1 window-ready=5\n'),
            until,
        );

        expect(await readFile(join(dir, 'mandor.log'), 'utf8')).not.toContain('old line');
    });

    it('closes the app when the window never says it is ready', async () => {
        await expect(measureStart(dir, opened('nothing to see\n'), until)).rejects.toThrow(
            'never ready',
        );
        expect(closed).toBe(1);
    });
});
