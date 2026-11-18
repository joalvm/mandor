import { rm } from 'node:fs/promises';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import {
    memoryAfterGc,
    type MemorySample,
} from '../../../../packages/host/tests/support/process-memory.js';
import { readStartup } from '../../../../packages/host/tests/support/startup-line.js';
import { createConnection, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox } from './support/launch-app.js';
import { dragToRightEdge, windowShape } from './support/window-shape.js';

/** A URL nothing answers on. These tabs are here to be arranged, never to be dialled. */
const NOWHERE = 'wss://127.0.0.1:9/socket';

/** Leaves the window split in two, with a connection tab in each half. */
async function splitInTwo(page: Page, repoRoot: string): Promise<void> {
    await expectFirstRun(page);
    await createConnection(page, 'alpha', NOWHERE, repoRoot);
    await createConnection(page, 'beta', NOWHERE, repoRoot);
    await dragToRightEdge(page, 'beta');
}

/** The heap of two readings in a row stays within 5 %: the garbage is gone, what is left is retained. */
function closeHeaps(before: MemorySample, after: MemorySample): boolean {
    return Math.abs(after.heapUsedMb - before.heapUsedMb) < before.heapUsedMb * 0.05;
}

/** The log of the start and the reading of memory, proven here where a window is already up. */
async function expectStartAndMemory(
    app: ElectronApplication,
    page: Page,
    userDataDir: string,
): Promise<void> {
    await expect
        .poll(() => readStartup(userDataDir))
        .toMatchObject({ 'window-ready': expect.any(Number) });

    // The window may still be settling a tooltip or a focus ring: wait for two readings alike.
    await expect
        .poll(async () => {
            const before = await memoryAfterGc(app, page);
            const after = await memoryAfterGc(app, page);

            return [before.domNodes === after.domNodes, closeHeaps(before, after)];
        })
        .toEqual([true, true]);
}

test('brings back the groups, the tabs of each one and the tab each group was showing', async () => {
    const sandbox = await makeSandbox();
    const { defaultRepoRoot, userDataDir } = sandbox;
    let running: ElectronApplication | undefined;

    try {
        const first = await launch(userDataDir, defaultRepoRoot);

        running = first.app;
        await splitInTwo(first.page, sandbox.repoRoot);

        const arranged = await windowShape(first.page);

        expect(arranged).toHaveLength(2);
        await running.close();
        running = undefined;
        const second = await launch(userDataDir, defaultRepoRoot);

        running = second.app;
        await expect(second.page.locator('.dv-groupview')).toHaveCount(2);
        await expect.poll(() => windowShape(second.page)).toEqual(arranged);
        await expectStartAndMemory(second.app, second.page, userDataDir);
    } finally {
        if (running !== undefined) {
            await running.close();
        }

        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
