type Metric = { memory: { workingSetSize: number }; type: string };

/** What main answers: its processes as the system sees them, and its own heap after collecting. */
type MainReading = { heapUsed: number; metrics: Metric[] };

/** What the sampler needs of a Chrome DevTools session: ask, and let go. */
type Cdp = {
    detach: () => Promise<void>;
    send: (
        method: 'HeapProfiler.collectGarbage' | 'Memory.getDOMCounters' | 'Runtime.getHeapUsage',
    ) => Promise<unknown>;
};

/** What it needs of the Electron application: to run a function inside main. */
export type MeasuredApp = {
    evaluate: (
        run: (electron: { app: { getAppMetrics: () => Metric[] } }) => MainReading,
    ) => Promise<unknown>;
};

/** What it needs of the window: to open a session on itself and to wait for a frame. */
export type MeasuredPage<Self> = {
    context: () => { newCDPSession: (page: Self) => Promise<Cdp> };
    evaluate: (script: string) => Promise<unknown>;
};

export type MemorySample = {
    /** The retained JS of the window, in MB, after collecting garbage. */
    heapUsedMb: number;
    /**
     * The data main retains, in MB, after collecting garbage: what every window sent and received
     * goes through it. The code V8 compiles for what runs hot is left out; it grows with use up
     * to a ceiling of its own, and it is no data anybody kept.
     */
    mainHeapUsedMb: number;
    /** What the system sees of every process of the app, in MB, and the same split by kind. */
    workingSetMb: number;
    byType: Record<string, number>;
    /** The DOM of the window: deterministic, so the best leak detector there is. */
    documents: number;
    domNodes: number;
    listeners: number;
};

const NEXT_FRAME = 'new Promise((done) => { requestAnimationFrame(() => { done(true); }); })';

function tenth(value: number): number {
    return Math.round(value * 10) / 10;
}

function megabytes(kilobytes: number): number {
    return tenth(kilobytes / 1024);
}

/**
 * How much memory the app uses now, after the garbage is gone. Counters, not snapshots: two
 * readings in a row land on the same numbers, and a number that grows by itself is a leak.
 * The frame goes first so the garbage of the last one is not measured, and the collection runs
 * twice because the first one frees what the second one finds unreachable.
 */
export async function memoryAfterGc<Page extends MeasuredPage<Page>>(
    app: MeasuredApp,
    page: Page,
): Promise<MemorySample> {
    const session = await page.context().newCDPSession(page);

    try {
        await page.evaluate(NEXT_FRAME);
        await session.send('HeapProfiler.collectGarbage');
        await session.send('HeapProfiler.collectGarbage');

        const heap = (await session.send('Runtime.getHeapUsage')) as { usedSize: number };
        const dom = (await session.send('Memory.getDOMCounters')) as {
            documents: number;
            jsEventListeners: number;
            nodes: number;
        };
        const { heapUsed, metrics } = (await app.evaluate(readMain)) as MainReading;

        return {
            byType: byType(metrics),
            documents: dom.documents,
            domNodes: dom.nodes,
            heapUsedMb: tenth(heap.usedSize / 1024 / 1024),
            mainHeapUsedMb: tenth(heapUsed / 1024 / 1024),
            listeners: dom.jsEventListeners,
            workingSetMb: megabytes(
                metrics.reduce((sum, one) => sum + one.memory.workingSetSize, 0),
            ),
        };
    } finally {
        await session.detach();
    }
}

/**
 * Runs inside main, so it names nothing of this module. The app is launched with
 * `--js-flags=--expose-gc`: a flag set once main runs would abort it, since V8 freezes them.
 */
function readMain({ app }: { app: { getAppMetrics: () => Metric[] } }): MainReading {
    const { gc } = globalThis;

    if (gc === undefined) {
        throw new Error('main has no gc(): launch the app with --js-flags=--expose-gc');
    }

    gc();
    gc();

    const heapUsed = process
        .getBuiltinModule('node:v8')
        .getHeapSpaceStatistics()
        .filter(({ space_name: space }) => !/code|trusted/.test(space))
        .reduce((sum, space) => sum + space.space_used_size, 0);

    return { heapUsed, metrics: app.getAppMetrics() };
}

function byType(metrics: Metric[]): Record<string, number> {
    const kilobytes: Record<string, number> = {};

    for (const { memory, type } of metrics) {
        kilobytes[type] = (kilobytes[type] ?? 0) + memory.workingSetSize;
    }

    return Object.fromEntries(Object.entries(kilobytes).map(([type, kb]) => [type, megabytes(kb)]));
}
