import { rm } from 'node:fs/promises';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { diskTree, entityNamed, filesIn } from '../../../../tools/workspace/disk-by-name.mjs';
import { startEchoServer } from '../../../../packages/transport-async/tests/support/echo-server.js';
import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import { createEvent, openEvent } from './support/collection-event.js';
import { chooseEnvironment, createEnvironment, environmentPicker } from './support/environment.js';
import { createConnection, defaultWorkspaceDir, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox, type Sandbox } from './support/launch-app.js';

const CONNECTION = 'Templated echo';
const MESSAGE = 'hello through an environment';
const TEMPLATE = 'ws://{{host}}/';

/** What the run composes and sends; a connection holding no event draws no composer at all. */
const EVENT = 'Saludo';

async function createHostEnvironment(page: Page, sandbox: Sandbox, host: string): Promise<void> {
    await createEnvironment(page, 'host', host);

    const tree = diskTree(sandbox.repoRoot);

    await expect
        .poll(async () => {
            const workspace = await defaultWorkspaceDir(sandbox.repoRoot).catch(() => '');
            const file = await entityNamed(tree, `${workspace}/environments`, 'New environment');

            return file === null ? '' : tree.read(file).catch(() => '');
        })
        .toContain(`value: ${host}`);
}

/**
 * A name nobody defined is not a form error: the connection dials it as it was written, fails
 * like any dial that finds no host, and no warning stands in the way of the next attempt.
 */
async function expectDialsUnresolvedWithoutEnvironment(page: Page): Promise<void> {
    await expect(environmentPicker(page)).toHaveText('No environment');
    await page.getByRole('button', { exact: true, name: 'Connect' }).click();
    await expect(page.getByRole('button', { exact: true, name: 'Connect' })).toBeVisible();
    await expect(page.locator('[data-part="toast"]').getByText('Missing: host')).toHaveCount(0);
}

async function connectAndSeeEcho(page: Page): Promise<void> {
    await page.getByRole('button', { exact: true, name: 'Connect' }).click();
    await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toBeVisible();
    await editorLines(
        page.getByRole('group', { name: 'Message composer' }),
        'schema-pane-editor',
    ).click();
    await page.keyboard.type(MESSAGE);
    await page.getByRole('button', { exact: true, name: 'Send' }).click();
    await expect(page.locator('[data-part="activity-row"][data-direction="in"]')).toHaveCount(1);
}

/**
 * What is written down is the template: what got resolved is the socket, never the file. The
 * connection is read by its name and not by its file — the file keeps the id the connection was
 * born with, and a rename is not a move.
 */
async function expectTemplateOnDisk(sandbox: Sandbox, host: string): Promise<void> {
    const tree = diskTree(sandbox.repoRoot);
    const workspace = await defaultWorkspaceDir(sandbox.repoRoot);
    const names = (await filesIn(tree, `${workspace}/connections`)).filter((name) =>
        name.endsWith('.yaml'),
    );
    const bodies = await Promise.all(names.map((name) => tree.read(name).catch(() => '')));

    const written = bodies.find((body) => body.includes('name: Templated echo'));

    expect(written).toBeDefined();
    expect(written).toContain(TEMPLATE);
    expect(written).not.toContain(host);
}

test('resolves a connection from the environment it chose and keeps the template on disk', async () => {
    const sandbox = await makeSandbox();
    const echo = await startEchoServer();
    let running: ElectronApplication | undefined;

    try {
        const launched = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

        running = launched.app;
        await expectFirstRun(launched.page);
        await createConnection(launched.page, CONNECTION, TEMPLATE, sandbox.repoRoot);
        await createHostEnvironment(launched.page, sandbox, new URL(echo.url).host);
        await expectDialsUnresolvedWithoutEnvironment(launched.page);
        await chooseEnvironment(launched.page);
        await createEvent(launched.page, EVENT);
        await openEvent(launched.page, EVENT);
        await connectAndSeeEcho(launched.page);
        await expectTemplateOnDisk(sandbox, new URL(echo.url).host);
    } finally {
        if (running !== undefined) {
            await running.close();
        }

        await echo.close();
        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
