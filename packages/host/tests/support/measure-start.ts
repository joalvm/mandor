import { rm } from 'node:fs/promises';
import { join } from 'node:path';

import { settledMemory, type PointedPage, type WaitUntil } from './memory-drift.js';
import type { MeasuredApp, MemorySample } from './process-memory.js';
import { readStartup } from './startup-line.js';

export type { WaitUntil } from './memory-drift.js';

/** What a start of the app costs: the moment the window was ready, and the memory it rests at. */
export type StartMeasure = {
    memory: MemorySample;
    windowReadyMs: number;
};

type Opened<Page> = {
    app: MeasuredApp & { close: () => Promise<void> };
    page: Page;
};

/**
 * One start of the app, measured. The log is emptied first so the start it tells about is this
 * one and not an earlier one. The memory is read once the window is at rest: two readings in a
 * row that agree on the DOM and the heap, which waits for what is still settling (a tooltip, a
 * focus ring) without a clock.
 */
export async function measureStart<Page extends PointedPage<Page>>(
    userDataDir: string,
    open: () => Promise<Opened<Page>>,
    until: WaitUntil,
): Promise<StartMeasure> {
    await rm(join(userDataDir, 'mandor.log'), { force: true });

    const { app, page } = await open();

    try {
        let windowReadyMs = 0;

        await until(async () => {
            windowReadyMs = (await readStartup(userDataDir))?.['window-ready'] ?? 0;

            return windowReadyMs > 0;
        });

        return { memory: await settledMemory(app, page, until), windowReadyMs };
    } finally {
        await app.close();
    }
}

/** Starts measured: the median of them is what a budget reads, so one slow start is not a failure. */
const STARTS = 3;

/**
 * What the budget reads. The first start lays the origin out (`git init`), which is not what a
 * person waits on every day, so it is run and left out. Then three starts: the time is the median
 * of them and the memory is that of the last one.
 */
export async function measureStarts<Page extends PointedPage<Page>>(
    userDataDir: string,
    open: () => Promise<Opened<Page>>,
    until: WaitUntil,
): Promise<Omit<MemorySample, 'byType' | 'documents' | 'listeners'> & { windowReadyMs: number }> {
    await measureStart(userDataDir, open, until);

    const starts: StartMeasure[] = [];

    for (let round = 0; round < STARTS; round += 1) {
        starts.push(await measureStart(userDataDir, open, until));
    }

    const times = starts.map((one) => one.windowReadyMs).sort((a, b) => a - b);
    const { domNodes, heapUsedMb, mainHeapUsedMb, workingSetMb } =
        starts[STARTS - 1]?.memory ?? EMPTY;

    return {
        domNodes,
        heapUsedMb,
        mainHeapUsedMb,
        windowReadyMs: times[STARTS >> 1] ?? 0,
        workingSetMb,
    };
}

const EMPTY = { domNodes: 0, heapUsedMb: 0, mainHeapUsedMb: 0, workingSetMb: 0 };
