import { rm } from 'node:fs/promises';

import { expect, test, type ElectronApplication, type Locator, type Page } from '@playwright/test';

import { startEchoServer } from '../../../../packages/transport-async/tests/support/echo-server.js';
import { createConnection, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox } from './support/launch-app.js';

const CONNECTION = 'Flaky echo';

/** Opens the row menu of the connection and picks one of its entries. */
async function runRowCommand(page: Page, name: string, command: string): Promise<void> {
    await page
        .getByRole('option', { name: new RegExp(name) })
        .getByRole('button', { name: 'Connection actions' })
        .click();
    await page.getByRole('menuitem', { exact: true, name: command }).click();
}

type ConnectionLocators = {
    /** Sidebar collection row: the only place the attempt badge and retry button mount. */
    row: Locator;
    /** Tab strip entry: carries the status dot, and nothing else about retry state. */
    tab: Locator;
};

function locatorsFor(page: Page, name: string): ConnectionLocators {
    return {
        row: page.getByRole('option', { name: new RegExp(name) }),
        tab: page.getByRole('tab', { name }),
    };
}

/** Dials the connection from its row, and hands back its locators once the dot says open. */
async function connectAndExpectOpen(page: Page, name: string): Promise<ConnectionLocators> {
    const locators = locatorsFor(page, name);
    const connected = locators.tab.getByRole('img', { exact: true, name: 'Connected' });

    // A partial accessible name also matches "Disconnected", before the first dial even starts.
    await expect(connected).toHaveCount(0);
    await runRowCommand(page, name, 'Connect');
    await expect(connected).toBeVisible();

    return locators;
}

/**
 * The attempt badge distinguishes automatic recovery from the first dial. The server returns
 * during the default policy's five attempts, before that policy gives up.
 */
async function expectReconnecting({ row, tab }: ConnectionLocators): Promise<void> {
    await expect(tab.getByRole('img', { exact: true, name: 'Connecting' })).toBeVisible();
    await expect(row.locator('[aria-label^="Attempt "]')).toBeVisible();
}

/** Nothing here clicks the retry button: the socket found its own way back on its own timer. */
async function expectRecovered({ row, tab }: ConnectionLocators): Promise<void> {
    await expect(tab.getByRole('img', { exact: true, name: 'Connected' })).toBeVisible();
    await expect(row.locator('[aria-label^="Attempt "]')).toHaveCount(0);
}

test('a connection finds its way back after the server it dials dies and returns', async () => {
    const sandbox = await makeSandbox();
    let echo = await startEchoServer();
    let running: ElectronApplication | undefined;

    try {
        const launched = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

        running = launched.app;

        const page = launched.page;

        await expectFirstRun(page);
        await createConnection(page, CONNECTION, echo.url, sandbox.repoRoot);

        const connection = await connectAndExpectOpen(page, CONNECTION);
        const port = Number(new URL(echo.url).port);

        await echo.close();
        await expectReconnecting(connection);

        echo = await startEchoServer(port);
        await expectRecovered(connection);
    } finally {
        if (running !== undefined) {
            await running.close();
        }

        // Whichever instance is live at this point already got here through its own close
        // call on the road to being revived; closing it again would only hide a real failure
        // behind "the server is not running".
        await echo.close().catch(() => undefined);
        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
