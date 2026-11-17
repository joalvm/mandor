import { rm } from 'node:fs/promises';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import {
    expectBackTo,
    settledMemory,
    type ExpectNoDrift,
    type WaitUntil,
} from '../../../../packages/host/tests/support/memory-drift.js';
import type { MemorySample } from '../../../../packages/host/tests/support/process-memory.js';
import {
    startEchoServer,
    type EchoServer,
} from '../../../../packages/transport-async/tests/support/echo-server.js';
import { createEvent, openEvent } from './support/collection-event.js';
import { launch, makeSandbox } from './support/launch-app.js';
import {
    END_OF_BURST,
    GROUPS,
    layOutWorkload,
    pushMessages,
    TABS_PER_GROUP,
} from './support/workload.js';

/**
 * The promise of the window, on Realtime: twenty tabs in four groups, an hour of messages, close
 * everything, and the window weighs what it weighed when it opened. An hour is a volume and not
 * a clock: two live connections at five messages a second for 3 600 s are 36 000 messages of a
 * kilobyte, which is what is pushed here as fast as the server sends them. Thirty-six megabytes
 * go through a buffer of two per connection, so the buffer turns over eighteen times.
 */
const LIVE = 2;
const MESSAGES = 36_000;
const MESSAGE_BYTES = 1024;
/** What the activity of one connection may hold, in MB. */
const ACTIVITY_BUFFER_MB = 2;
/** The room the heap under load has over what the buffers make it hold. */
const LOAD_MARGIN = 0.2;

const EVENT = 'Saludo';

const until: WaitUntil = (ready) => expect.poll(ready, { timeout: 60_000 }).toBe(true);
const noDrift: ExpectNoDrift = (drift) => expect.poll(drift, { timeout: 60_000 }).toEqual([]);

// The budget is long on purpose: it is two starts of the app and 36 000 frames through a window
// on a runner of two cores, and a shorter one would read a slow machine as a leak.
test.setTimeout(10 * 60_000);

/** The row of the activity that says the burst is over, in the connection in front. */
function endRow(page: Page) {
    return page.locator('[data-part="activity-row"][data-direction="in"]', {
        hasText: END_OF_BURST,
    });
}

async function expectWorkloadRestored(page: Page): Promise<void> {
    await expect(page.locator('.dv-groupview')).toHaveCount(GROUPS);
    await expect(page.getByRole('tab', { name: /^seed-/ })).toHaveCount(GROUPS * TABS_PER_GROUP);
    await createEvent(page, EVENT);
    await openEvent(page, EVENT);
}

/**
 * Brings a connection to the front from the collection of the sidebar. The four groups are too
 * narrow to show their tabs, which collapse into a list, so the strip is not where they are reached.
 */
async function bringToFront(page: Page, name: string): Promise<void> {
    await page.getByRole('option', { exact: true, name }).click();
}

/** Both live connections got the whole burst: the second is a tab behind the first. */
async function expectBurstArrived(page: Page): Promise<void> {
    await expect(endRow(page).first()).toBeVisible({ timeout: 120_000 });
    await bringToFront(page, 'seed-01');
    await openEvent(page, EVENT);
    await expect(endRow(page).first()).toBeVisible();
}

/** Closes every tab of the window, the live connections among them, one by one. */
async function closeEveryTab(page: Page): Promise<void> {
    for (let index = GROUPS * TABS_PER_GROUP - 1; index >= 0; index -= 1) {
        const name = `seed-${String(index).padStart(2, '0')}`;

        await bringToFront(page, name);
        await page.keyboard.press('ControlOrMeta+KeyW');
        await expect(page.getByRole('tab', { exact: true, name })).toHaveCount(0);
    }
}

/** What the heap may hold under load: what it held, the buffers of the live ones, and a margin. */
function loadCeilingMb(base: MemorySample): number {
    return (base.heapUsedMb + LIVE * ACTIVITY_BUFFER_MB) * (1 + LOAD_MARGIN);
}

type Readings = { base: MemorySample; loaded: MemorySample; closed: MemorySample };

/** Opens the window, takes the burst, closes every tab: the three readings of the promise. */
async function liveThroughTheHour(
    { app, page }: { app: ElectronApplication; page: Page },
    echo: EchoServer,
): Promise<Readings> {
    await expectWorkloadRestored(page);

    const base = await settledMemory(app, page, until);

    await pushMessages(echo, MESSAGES, MESSAGE_BYTES);
    await expectBurstArrived(page);

    const loaded = await settledMemory(app, page, until);

    await closeEveryTab(page);

    return { base, loaded, closed: await settledMemory(app, page, until) };
}

test('twenty tabs and an hour of messages leave the window where it started', async () => {
    const sandbox = await makeSandbox();
    const echo = await startEchoServer();
    let running: ElectronApplication | undefined;

    try {
        await layOutWorkload(sandbox, echo.url, LIVE);

        const window = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

        running = window.app;

        const { base, loaded, closed } = await liveThroughTheHour(window, echo);

        test.info().annotations.push({
            type: 'measured',
            description: JSON.stringify({ base, loaded, closed, ceiling: loadCeilingMb(base) }),
        });
        expect(loaded.heapUsedMb).toBeLessThanOrEqual(loadCeilingMb(base));
        await expectBackTo(base, { ...window, noDrift });
    } finally {
        if (running !== undefined) {
            await running.close();
        }

        await echo.close();
        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
