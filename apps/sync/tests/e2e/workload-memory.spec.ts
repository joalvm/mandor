import { rm } from 'node:fs/promises';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import {
    expectBackTo,
    settledMemory,
    type ExpectNoDrift,
    type WaitUntil,
} from '../../../../packages/host/tests/support/memory-drift.js';
import type { MemorySample } from '../../../../packages/host/tests/support/process-memory.js';
import { launch, makeSandbox } from './support/launch-app.js';
import { startLocalHttpServer, type LocalHttpServer } from './support/local-http-server.js';
import { GROUPS, layOutWorkload, TABS_PER_GROUP } from './support/workload.js';

/**
 * The promise of a long session, on Sync: twenty requests in four groups, a working day of sends,
 * close everything, and the window weighs what it weighed when it opened. A working day is a
 * volume and not a clock: forty sends a minute for the better part of an hour is 2 000 sends of a
 * response of four kilobytes, which is what is sent here as fast as the server answers.
 *
 * Under load the heap is held to what it held once every group had shown one response: the first
 * answer of a group builds its viewer, which is the price of showing a response and not something
 * the day piles up. Closing every tab gives that price back, and the window weighs what it did.
 */
const SENDS = 2_000;
/** The room the heap under load has over what it held once every group had shown a response. */
const LOAD_MARGIN = 0.2;

const until: WaitUntil = (ready) => expect.poll(ready, { timeout: 60_000 }).toBe(true);
const noDrift: ExpectNoDrift = (drift) => expect.poll(drift, { timeout: 60_000 }).toEqual([]);

// The budget is long on purpose: it is two starts of the app and 2 000 sends through a window on
// a runner of two cores, and a shorter one would read a slow machine as a leak.
test.setTimeout(10 * 60_000);

function urlOf(page: Page) {
    return page.getByRole('textbox', { name: 'URL' });
}

function requestTabs(page: Page) {
    return page.getByRole('tab', { name: /^req-/ });
}

async function expectWorkloadRestored(page: Page): Promise<void> {
    await expect(page.locator('.dv-groupview')).toHaveCount(GROUPS);
    await expect(requestTabs(page)).toHaveCount(GROUPS * TABS_PER_GROUP);
    await expect(urlOf(page)).toHaveCount(GROUPS);
}

/**
 * Sends from the request in front of one group, one at a time, each waited for by its count. The
 * four groups are too narrow for the button to be clear of its neighbour, so the click is
 * dispatched to it and not made at its centre.
 */
async function sendFrom(
    page: Page,
    server: LocalHttpServer,
    group: number,
    count: number,
): Promise<void> {
    const send = page.locator('.dv-groupview').nth(group).getByRole('button', { name: 'Send' });

    for (let sent = 0; sent < count; sent += 1) {
        const expected = server.answers() + 1;

        await send.dispatchEvent('click');
        await expect
            .poll(server.answers, { intervals: [10, 25, 50], timeout: 30_000 })
            .toBe(expected);
    }
}

/** Sends `count` from the request in front of each group, one group after the other. */
async function sendFromEachGroup(
    page: Page,
    server: LocalHttpServer,
    count: number,
): Promise<void> {
    for (let group = 0; group < GROUPS; group += 1) {
        await sendFrom(page, server, group, count);
    }
}

/**
 * Closes every tab of the window, one by one, the first of the strip each time. The tab is what is
 * clicked: a point inside the panel lands on whatever the size of the window puts there.
 */
async function closeEveryTab(page: Page): Promise<void> {
    for (let left = GROUPS * TABS_PER_GROUP - 1; left >= 0; left -= 1) {
        await requestTabs(page).first().click();
        await page.keyboard.press('ControlOrMeta+KeyW');
        await expect(requestTabs(page)).toHaveCount(left);
    }
}

/** What the heap may hold under load: what it held with a response in every group, and a margin. */
function loadCeilingMb(warm: MemorySample): number {
    return warm.heapUsedMb * (1 + LOAD_MARGIN);
}

/** The same for main: every send goes through it, and none of them may stay there. */
function mainLoadCeilingMb(warm: MemorySample): number {
    return warm.mainHeapUsedMb * (1 + LOAD_MARGIN);
}

type Readings = {
    base: MemorySample;
    warm: MemorySample;
    loaded: MemorySample;
    closed: MemorySample;
};

/**
 * Opens the window, has every group show a response, takes the rest of the day's sends and closes
 * every tab: the four readings of the promise.
 */
async function liveThroughTheDay(
    { app, page }: { app: ElectronApplication; page: Page },
    server: LocalHttpServer,
): Promise<Readings> {
    await expectWorkloadRestored(page);

    const base = await settledMemory(app, page, until);

    await sendFromEachGroup(page, server, 1);

    const warm = await settledMemory(app, page, until);

    await sendFromEachGroup(page, server, SENDS / GROUPS - 1);

    const loaded = await settledMemory(app, page, until);

    await closeEveryTab(page);

    return { base, warm, loaded, closed: await settledMemory(app, page, until) };
}

test('twenty requests and a day of sends leave the window where it started', async () => {
    const sandbox = await makeSandbox();
    const server = await startLocalHttpServer();
    let running: ElectronApplication | undefined;

    try {
        await layOutWorkload(sandbox, `${server.origin}/answer`);

        const window = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

        running = window.app;

        const { base, warm, loaded, closed } = await liveThroughTheDay(window, server);

        test.info().annotations.push({
            type: 'measured',
            description: JSON.stringify({
                base,
                warm,
                loaded,
                closed,
                ceiling: loadCeilingMb(warm),
                mainCeiling: mainLoadCeilingMb(warm),
            }),
        });
        await expectBackTo(base, { ...window, noDrift });
        expect(loaded.heapUsedMb).toBeLessThanOrEqual(loadCeilingMb(warm));
        expect(loaded.mainHeapUsedMb).toBeLessThanOrEqual(mainLoadCeilingMb(warm));
    } finally {
        if (running !== undefined) {
            await running.close();
        }

        await server.close();
        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
