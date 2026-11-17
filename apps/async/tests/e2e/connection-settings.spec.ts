import { rm } from 'node:fs/promises';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { diskTree, filesIn } from '../../../../tools/workspace/disk-by-name.mjs';
import { startEchoServer } from '../../../../packages/transport-async/tests/support/echo-server.js';
import { createConnection, defaultWorkspaceDir, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox, type Sandbox } from './support/launch-app.js';

const CONNECTION = 'Configured echo';

/** The row of the collection the connection is found by, sidebar section included. */
function rowOf(page: Page, name: string) {
    return page.getByRole('option', { name: new RegExp(name) });
}

/** Opens the row menu and picks one of its entries. */
async function runRowCommand(page: Page, name: string, command: string): Promise<void> {
    await rowOf(page, name).getByRole('button', { name: 'Connection actions' }).click();
    await page.getByRole('menuitem', { exact: true, name: command }).click();
}

/** The change is on disk when the connection file carries the settings the form wrote. */
async function expectSettingsOnDisk(sandbox: Sandbox, fragment: string): Promise<void> {
    const tree = diskTree(sandbox.repoRoot);

    await expect
        .poll(async () => {
            // The app replaces a file by writing a temporary one beside it and renaming it
            // over the old one, so a listing can name a file that is gone by the time it is
            // opened. Neither the temporary nor the gap is an answer: both are one more turn.
            const workspace = await defaultWorkspaceDir(sandbox.repoRoot).catch(() => '');
            const files = (await filesIn(tree, `${workspace}/connections`)).filter((file) =>
                file.endsWith('.yaml'),
            );
            const contents = await Promise.all(
                files.map((file) => tree.read(file).catch(() => '')),
            );

            return contents.some((content) => content.includes(fragment));
        })
        .toBe(true);
}

/** Turns the retry policy off from the modal, and closes it once the disk has learned it. */
async function turnRetryOffAndClose(page: Page, sandbox: Sandbox): Promise<void> {
    await runRowCommand(page, CONNECTION, 'Settings');
    await expect(page.getByRole('dialog', { name: 'Connection' })).toBeVisible();
    await page.getByRole('option', { name: 'Retry' }).click();
    await page.getByRole('switch', { name: 'Reconnect when the server hangs up' }).click();
    await expectSettingsOnDisk(sandbox, 'enabled: false');
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
}

test('the connection is configured and switched from the row it lives in', async () => {
    const sandbox = await makeSandbox();
    const echo = await startEchoServer();
    let running: ElectronApplication | undefined;

    try {
        const launched = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

        running = launched.app;
        await expectFirstRun(launched.page);
        await createConnection(launched.page, CONNECTION, echo.url, sandbox.repoRoot);

        const page = launched.page;

        // The strip of the tab no longer offers a settings section.
        await expect(page.getByRole('tab', { name: 'Settings' })).toHaveCount(0);

        // The retry section of the modal turns the policy off, and the file learns it alone.
        await turnRetryOffAndClose(page, sandbox);

        // The switch of the row dials, and the same menu offers the way down.
        await runRowCommand(page, CONNECTION, 'Connect');
        await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toBeVisible();
        await runRowCommand(page, CONNECTION, 'Disconnect');
        await expect(page.getByRole('button', { exact: true, name: 'Connect' })).toBeVisible();
    } finally {
        if (running !== undefined) {
            await running.close();
        }

        await echo.close();
        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
