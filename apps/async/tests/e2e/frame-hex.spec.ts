import { rm } from 'node:fs/promises';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { startEchoServer } from '../../../../packages/transport-async/tests/support/echo-server.js';
import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import { createEvent, openEvent } from './support/collection-event.js';
import { watchCspViolations } from '../../../../packages/ui/tests/support/csp-violations.js';
import { createConnection, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox } from './support/launch-app.js';

/** The composer only exists for an event the connection holds, and the socket opens from it. */
const EVENT = 'Saludo';

/** A frame that never was text: two control bytes and a word after them. */
const FRAME = `${String.fromCodePoint(0, 1)}hola`;

/** The offset, the six bytes in capitals and what they spell, once the columns are read as one. */
const DUMP = '00000000: 00 01 68 6F 6C 61 ..hola';

/** A first run that ends with an event the echo connection holds, not open yet. */
async function holdEvent(page: Page, url: string, repoRoot: string): Promise<void> {
    await expectFirstRun(page);
    await createConnection(page, 'Echo', url, repoRoot);
    await createEvent(page, EVENT);
}

async function connect(page: Page): Promise<void> {
    await page.getByRole('button', { exact: true, name: 'Connect' }).press('Enter');
    await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toBeVisible();
}

/** The dump of the frame, and the same dump after a key is pressed over it. */
async function expectReadOnlyDump(page: Page): Promise<void> {
    const dump = editorLines(page, 'frame-payload-view');

    await expect(dump).toHaveText(DUMP);
    await dump.click();
    await page.keyboard.type('x');
    await expect(dump).toHaveText(DUMP);
}

test('shows a frame that never was text as a dump of its bytes nobody can edit', async () => {
    const sandbox = await makeSandbox();
    const echo = await startEchoServer();
    let running: ElectronApplication | undefined;

    try {
        const { app, page } = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

        running = app;
        await holdEvent(page, echo.url, sandbox.repoRoot);

        // Watched from the first editor on: what the policy says about the rest of the window is
        // not what this run is about.
        const refused = watchCspViolations(page);

        await openEvent(page, EVENT);
        await connect(page);
        echo.broadcastText(FRAME);
        await page.locator('[data-part="activity-row"][data-direction="in"]').first().click();
        await expectReadOnlyDump(page);

        expect(refused).toEqual([]);
    } finally {
        if (running !== undefined) {
            await running.close();
        }

        await echo.close();
        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
