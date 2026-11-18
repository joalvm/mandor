import { rm } from 'node:fs/promises';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { startEchoServer } from '../../../../packages/transport-async/tests/support/echo-server.js';
import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import { createEvent, openEvent } from './support/collection-event.js';
import { launch, makeSandbox } from './support/launch-app.js';
import { GROUPS, layOutWorkload, TABS_PER_GROUP } from './support/workload.js';

/** Two of the twenty connections come back dialled, and both of them are being talked to. */
const LIVE = 2;

/** How often the server pushes, so the window is drawing messages the whole time it is typed in. */
const PUSH_EVERY_MS = 25;

/** A frame that took longer than this is a frame the typist saw. */
const LONG_FRAME_MS = 50;

/**
 * Long frames allowed in the burst. Measured on the machine this was written on: around a
 * hundred and sixty frames drawn, the worst of them 30 ms, and none of them long. The ceiling
 * sits well above that so a loaded CI runner is not read as a regression, and low enough that
 * a window that stops answering the keyboard for a tenth of a second fails here.
 */
const BUDGET = 12;

const BURST = 'the quick brown fox jumps over the lazy dog';

/**
 * The last words of the burst. The editor wraps a narrow pane and draws only the lines in view, so
 * the start of the text may sit out of sight; the keys arrive in order, and the last ones there
 * mean the whole burst went in.
 */
const TAIL = 'lazy dog';

/** What the typing goes into. The composer and the activity under it both hang from an event. */
const EVENT = 'Saludo';

/** Counts the frames of a burst of typing, and hands back the ones that took too long. */
async function longFramesWhileTyping(page: Page): Promise<number> {
    await page.evaluate(() => {
        const frames: number[] = [];

        Object.assign(window, { mandorFrames: frames });
        let previous = performance.now();
        const tick = (): void => {
            const now = performance.now();

            frames.push(now - previous);
            previous = now;
            requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
    });

    const composer = page.getByRole('group', { name: 'Message composer' }).first();

    await editorLines(composer, 'schema-pane-editor').click();

    for (let round = 0; round < 3; round += 1) {
        await page.keyboard.type(BURST, { delay: 10 });
    }

    // What was typed has to have arrived, or the frames counted are the frames of an idle window.
    await expect(composer).toContainText(TAIL);

    return page.evaluate((limit) => {
        const frames = (window as unknown as { mandorFrames: number[] }).mandorFrames;

        return frames.filter((frame) => frame > limit).length;
    }, LONG_FRAME_MS);
}

async function expectWorkloadRestored(page: Page): Promise<void> {
    await expect(page.locator('.dv-groupview')).toHaveCount(GROUPS);
    await expect(page.getByRole('tab', { name: /^seed-/ })).toHaveCount(GROUPS * TABS_PER_GROUP);
    // A connection holding no event is one page asking for one: the event is what the window
    // draws a composer and a timeline for, and both are what the budget is measured on.
    await createEvent(page, EVENT);
    await openEvent(page, EVENT);
    await expect(
        page.locator('[data-part="activity-row"][data-direction="in"]').first(),
    ).toBeVisible();
}

test('keeps typing smooth in a full window with connections talking', async () => {
    const sandbox = await makeSandbox();
    const { defaultRepoRoot, userDataDir } = sandbox;
    const echo = await startEchoServer();
    const pushing = setInterval(() => {
        echo.broadcastText(`{"at":${String(Date.now())}}`);
    }, PUSH_EVERY_MS);
    let running: ElectronApplication | undefined;

    try {
        await layOutWorkload(sandbox, echo.url, LIVE);

        const second = await launch(userDataDir, defaultRepoRoot);

        running = second.app;
        await expectWorkloadRestored(second.page);

        const long = await longFramesWhileTyping(second.page);

        expect(long).toBeLessThanOrEqual(BUDGET);
    } finally {
        clearInterval(pushing);

        if (running !== undefined) {
            await running.close();
        }

        await echo.close();
        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
