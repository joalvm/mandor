import { access, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { startEchoServer } from '../../../../packages/transport-async/tests/support/echo-server.js';
import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import { createEvent, openEvent } from './support/collection-event.js';
import { createConnection, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox } from './support/launch-app.js';

const MESSAGE = 'hello from Mandor';

/** The event the run composes in: a connection holding none shows the page that asks for one. */
const EVENT = 'Saludo';

async function createFirstRun(page: Page, url: string, repoRoot: string): Promise<void> {
    await expectFirstRun(page);
    await createConnection(page, 'Echo', url, repoRoot);
    await createEvent(page, EVENT);
    await openEvent(page, EVENT);
}

async function sendAndSeeEcho(page: Page): Promise<void> {
    const connect = page.getByRole('button', { exact: true, name: 'Connect' });

    await expect(connect).toBeEnabled();
    await connect.press('Enter');
    await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toBeVisible();
    const composer = page.getByRole('group', { name: 'Message composer' });
    const composerHeight = await composer.evaluate(
        (element) => element.getBoundingClientRect().height,
    );

    expect(composerHeight).toBeGreaterThan(100);

    await editorLines(composer, 'schema-pane-editor').click();
    await page.keyboard.type(MESSAGE);
    await page.getByRole('button', { exact: true, name: 'Send' }).click();
    await expect(page.locator('[data-part="activity-row"][data-direction="in"]')).toHaveCount(1);
}

async function expectSessionSaved(repoRoot: string): Promise<void> {
    await expect
        .poll(async () => {
            try {
                await access(join(repoRoot, '.mandor', 'session.yaml'));

                return true;
            } catch {
                return false;
            }
        })
        .toBe(true);
}

async function expectRestored(page: Page, url: string): Promise<void> {
    await expect(page.getByRole('tab', { name: 'Echo' })).toBeVisible();
    await expect(
        page.locator('[data-part="connection-toolbar"]').getByRole('textbox', {
            name: 'Connection URL',
        }),
    ).toHaveText(url);
}

test('creates the first async workspace and restores it after relaunch', async () => {
    const sandbox = await makeSandbox();
    const { defaultRepoRoot, repoRoot, userDataDir } = sandbox;
    const echo = await startEchoServer();
    let running: ElectronApplication | undefined;

    try {
        const first = await launch(userDataDir, defaultRepoRoot);

        running = first.app;
        await createFirstRun(first.page, echo.url, sandbox.repoRoot);
        await sendAndSeeEcho(first.page);
        await expectSessionSaved(repoRoot);
        await running.close();
        running = undefined;
        const second = await launch(userDataDir, defaultRepoRoot);

        running = second.app;
        await expectRestored(second.page, echo.url);
    } finally {
        if (running !== undefined) {
            await running.close();
        }

        await echo.close();
        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
