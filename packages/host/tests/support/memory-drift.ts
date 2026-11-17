import {
    memoryAfterGc,
    type MeasuredApp,
    type MeasuredPage,
    type MemorySample,
} from './process-memory.js';

/**
 * A window whose pointer can be moved. What the pointer rests on is state of the pointer: a
 * tooltip opens under it a second and a half after a move ends, so a reading that lands just
 * before or just after holds hundreds of listeners more or less.
 */
export type PointedPage<Page> = MeasuredPage<Page> & {
    mouse: { move: (x: number, y: number) => Promise<void> };
};

/** Waits until the answer is true, or fails: `expect.poll(ready).toBe(true)` of the runner. */
export type WaitUntil = (ready: () => Promise<boolean>) => Promise<void>;

/** How far the DOM may drift from where it was: nothing but a settling tooltip. */
const DOM_MARGIN = 0.05;
/**
 * React listens to every event on the container of each portal, around 280 listeners, and never
 * takes them off: they leave with the container. The last ones a window closed can stay held by the
 * spare copy of the tree until something else redraws there, and a window at rest draws nothing.
 * Two of them are not a leak; one kept on every round goes past this within a few rounds.
 */
const HELD_PORTAL_LISTENERS = 2 * 290;
/** The heap breathes more than the DOM does, so it gets more room. */
const HEAP_MARGIN = 0.15;
/** How far the heap may move between two readings in a row that still count as at rest. */
const SETTLED_HEAP_MARGIN = 0.05;

/** The heap of two readings in a row stays within 5 %. */
function closeHeaps(before: MemorySample, after: MemorySample): boolean {
    return Math.abs(after.heapUsedMb - before.heapUsedMb) < before.heapUsedMb * SETTLED_HEAP_MARGIN;
}

/**
 * The memory of a window at rest, with the pointer in its corner: two readings in a row that agree
 * on the nodes, the listeners and the heap, which waits for what is still settling (a tooltip
 * closing, a focus ring, a listener the collector has not taken yet) without a clock.
 */
export async function settledMemory<Page extends PointedPage<Page>>(
    app: MeasuredApp,
    page: Page,
    until: WaitUntil,
): Promise<MemorySample> {
    await page.mouse.move(0, 0);

    let memory = await memoryAfterGc(app, page);

    await until(async () => {
        const before = await memoryAfterGc(app, page);

        memory = await memoryAfterGc(app, page);

        return (
            before.domNodes === memory.domNodes &&
            before.listeners === memory.listeners &&
            closeHeaps(before, memory)
        );
    });

    return memory;
}

/**
 * What a window kept that it should have let go of, in words: nodes and listeners within 5 % of
 * where they started, the listeners with the portals a window may still hold on top, the heap of
 * the window and of main within 15 %. Empty when it came back to where it was.
 */
export function memoryDrift(base: MemorySample, after: MemorySample): string[] {
    const readings: [string, number, number, number, number][] = [
        ['DOM nodes', base.domNodes, after.domNodes, DOM_MARGIN, 0],
        ['listeners', base.listeners, after.listeners, DOM_MARGIN, HELD_PORTAL_LISTENERS],
        ['heap (MB)', base.heapUsedMb, after.heapUsedMb, HEAP_MARGIN, 0],
        ['main heap (MB)', base.mainHeapUsedMb, after.mainHeapUsedMb, HEAP_MARGIN, 0],
    ];

    return readings
        .filter(([, before, now, margin, held]) => now > before * (1 + margin) + held)
        .map(([name, before, now]) => `${name}: ${String(before)} -> ${String(now)}`);
}

/**
 * Waits until a reading finds nothing kept, or fails naming what the last one found:
 * `expect.poll(drift).toEqual([])` of the runner.
 */
export type ExpectNoDrift = (drift: () => Promise<string[]>) => Promise<void>;

/**
 * Waits for the window to come back within the margins of `base`, or fails naming what it kept.
 * A window at rest is not back yet: a library may hold what was closed behind a timer of its own
 * (dockview keeps a closed tab strip, and the whole tab with it, for the half second of a resize
 * it does not cancel on dispose), and two readings in a row agree while it waits. What a window
 * kept never comes back, and the wait gives up at its ceiling.
 */
export async function expectBackTo<Page extends PointedPage<Page>>(
    base: MemorySample,
    window: { app: MeasuredApp; page: Page; noDrift: ExpectNoDrift },
): Promise<void> {
    await window.page.mouse.move(0, 0);
    await window.noDrift(async () =>
        memoryDrift(base, await memoryAfterGc(window.app, window.page)),
    );
}

/**
 * Runs the move `rounds` more times and waits for the window to come back to where it was. The
 * first run is not counted: it loads what loads on first use (a module, a font), which is not a
 * leak. The base is read after it, once the window is at rest.
 */
export async function expectBackAfterRounds<Page extends PointedPage<Page>>(
    window: { app: MeasuredApp; page: Page; until: WaitUntil; noDrift: ExpectNoDrift },
    move: () => Promise<void>,
    rounds: number,
): Promise<void> {
    await move();

    const base = await settledMemory(window.app, window.page, window.until);

    for (let round = 0; round < rounds; round += 1) {
        await move();
    }

    await expectBackTo(base, window);
}
