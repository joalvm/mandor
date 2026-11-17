import { describe, expect, it } from 'vitest';

import {
    expectBackAfterRounds,
    memoryDrift,
    settledMemory,
    type ExpectNoDrift,
} from './memory-drift.js';
import type { MemorySample } from './process-memory.js';

const BASE: MemorySample = {
    byType: {},
    documents: 1,
    domNodes: 1000,
    heapUsedMb: 20,
    listeners: 200,
    mainHeapUsedMb: 10,
    workingSetMb: 100,
};

type FakePage = {
    context: () => {
        newCDPSession: (page: FakePage) => Promise<{
            detach: () => Promise<void>;
            send: (method: string) => Promise<unknown>;
        }>;
    };
    evaluate: () => Promise<unknown>;
    mouse: { move: (x: number, y: number) => Promise<void> };
};

function pageReading(nodes: () => number, listeners: () => number = () => 3): FakePage {
    const page: FakePage = {
        context: () => ({
            newCDPSession: () =>
                Promise.resolve({
                    detach: () => Promise.resolve(),
                    send: (method: string) =>
                        Promise.resolve(
                            method === 'Memory.getDOMCounters'
                                ? { documents: 1, jsEventListeners: listeners(), nodes: nodes() }
                                : { usedSize: 8 * 1024 * 1024 },
                        ),
                }),
        }),
        evaluate: () => Promise.resolve(true),
        mouse: { move: () => Promise.resolve() },
    };

    return page;
}

const APP = {
    evaluate: () =>
        Promise.resolve({
            heapUsed: 4 * 1024 * 1024,
            metrics: [{ memory: { workingSetSize: 1024 }, type: 'Tab' }],
        }),
};

/** The `expect.poll` of the runner, in five tries: the readings of these windows settle sooner. */
async function askFiveTimes(ready: () => Promise<boolean>): Promise<void> {
    for (let round = 0; round < 5 && !(await ready()); round += 1) {
        // asks again
    }
}

describe('what a window kept (memory-drift)', () => {
    it('finds nothing in a window that came back to where it was, within the margins', () => {
        expect(
            memoryDrift(BASE, { ...BASE, domNodes: 1049, heapUsedMb: 22.9, listeners: 209 }),
        ).toEqual([]);
    });

    it('lets the listeners go as far as the two portals a window may still hold', () => {
        expect(memoryDrift(BASE, { ...BASE, listeners: 790 })).toEqual([]);
        expect(memoryDrift(BASE, { ...BASE, listeners: 791 })).toEqual(['listeners: 200 -> 791']);
    });

    it('names each measure that grew past its margin', () => {
        const problems = memoryDrift(BASE, {
            ...BASE,
            domNodes: 1100,
            heapUsedMb: 24,
            listeners: 200,
            mainHeapUsedMb: 12,
        });

        expect(problems).toEqual([
            'DOM nodes: 1000 -> 1100',
            'heap (MB): 20 -> 24',
            'main heap (MB): 10 -> 12',
        ]);
    });

    it('waits until two readings in a row agree before it gives the memory', async () => {
        let reads = 0;
        const page = pageReading(() => {
            reads += 1;

            return reads < 3 ? reads : 500;
        });
        const memory = await settledMemory(APP, page, askFiveTimes);

        expect(memory.domNodes).toBe(500);
    });

    /** A listener let go of is counted until the collector takes it, after the nodes are gone. */
    it('waits for the listeners to agree too, not only the nodes', async () => {
        const readings = [100, 200, 300, 400];
        let reads = 0;
        const page = pageReading(
            () => 500,
            () => readings[Math.min(reads++, readings.length - 1)] ?? 0,
        );
        const memory = await settledMemory(APP, page, askFiveTimes);

        expect(memory.listeners).toBe(400);
    });

    /** A tooltip that opens late under a pointer left on a button is the pointer's, not a leak. */
    it('reads the window with the pointer out of the way', async () => {
        let hovering = true;
        const page = pageReading(
            () => 100,
            () => (hovering ? 300 : 3),
        );

        page.mouse = {
            move: (x, y) => {
                hovering = x !== 0 || y !== 0;

                return Promise.resolve();
            },
        };

        const memory = await settledMemory(APP, page, askFiveTimes);

        expect(memory.listeners).toBe(3);
    });

    it('does not count the first run and tells what the rounds after it left behind', async () => {
        let nodes = 100;
        const page = pageReading(() => nodes);
        const kept: string[][] = [];
        const noDrift: ExpectNoDrift = async (drift) => {
            kept.push(await drift());
        };

        const move = (): Promise<void> => {
            nodes += 50;

            return Promise.resolve();
        };

        await expectBackAfterRounds({ app: APP, page, until: askFiveTimes, noDrift }, move, 2);

        expect(kept).toEqual([['DOM nodes: 150 -> 250']]);
    });

    /** What a timer of a library holds for a moment after a close comes back: it was not kept. */
    it('asks again until the window is back where it was', async () => {
        let nodes = 100;
        const page = pageReading(() => nodes);
        const kept: string[][] = [];
        const noDrift: ExpectNoDrift = async (drift) => {
            for (let round = 0; round < 5; round += 1) {
                const now = await drift();

                kept.push(now);
                nodes = 150;

                if (now.length === 0) {
                    return;
                }
            }
        };

        const move = (): Promise<void> => {
            nodes += 50;

            return Promise.resolve();
        };

        await expectBackAfterRounds({ app: APP, page, until: askFiveTimes, noDrift }, move, 2);

        expect(kept).toEqual([['DOM nodes: 150 -> 250'], []]);
    });
});
