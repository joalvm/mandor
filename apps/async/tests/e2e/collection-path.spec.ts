import { rm } from 'node:fs/promises';

import { expect, test, type ElectronApplication, type Locator, type Page } from '@playwright/test';

import { diskTree, itemNamed, onDisk } from '../../../../tools/workspace/disk-by-name.mjs';
import { startEchoServer } from '../../../../packages/transport-async/tests/support/echo-server.js';
import { scaleTokenValues } from '../../../../packages/ui/src/styles/token-scale-values.js';
import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import { nameNewMessage } from './support/collection-event.js';
import { chooseEnvironment, createEnvironment } from './support/environment.js';
import { createConnection, defaultWorkspaceDir, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox, type Sandbox } from './support/launch-app.js';

const ITEM = 'Pedido de prueba';
const VALUE = 'correlation-value';

async function keepAndSend(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'New collection' }).click();
    await page.getByRole('textbox', { name: 'New name' }).fill('events');
    await page.getByRole('textbox', { name: 'New name' }).press('Enter');
    const folder = page.getByRole('treeitem', { name: 'events' });

    await expect(folder).toBeVisible();
    await folder.getByRole('button', { name: 'Row options' }).click();
    await page.getByRole('menuitem', { name: 'New message' }).click();
    await nameNewMessage(page, ITEM);

    await page.getByRole('treeitem', { name: ITEM }).click();
    await expect(page.getByRole('tab', { name: ITEM })).toHaveCount(0);
    await editorLines(
        page.getByRole('group', { name: 'Message composer' }),
        'schema-pane-editor',
    ).click();
    await page.keyboard.insertText('{ "id": "{{correlation}}" }');
    await page.keyboard.press('Control+s');
    await page.getByRole('button', { exact: true, name: 'Send' }).click();
    await expect(page.locator('[data-part="activity-row"][data-direction="in"]')).toHaveCount(1);
}

/** The box is what carries the height; the editable inside only carries the caret. */
type Measured = NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>;

async function boxOf(field: Locator): Promise<Measured> {
    const box = await field.locator('xpath=ancestor::div[@data-part="input"]').boundingBox();

    if (box === null) {
        throw new Error('the field around the editable never measured');
    }

    return box;
}

/** The field of the header is a field like any other: 26 on the scale, with its search glyph. */
async function expectHeaderField(page: Page): Promise<void> {
    expect((await boxOf(page.getByRole('searchbox', { name: 'Search workspace' }))).height).toBe(
        26,
    );
}

/**
 * The address of the connection is the one field allowed to stand taller: the height of the
 * address on the scale. The address is the fused control — environment, url and frame in one
 * band — so the band is what gets measured.
 */
async function expectUrlField(page: Page): Promise<void> {
    const box = await page
        .locator('[data-part="connection-toolbar"] [data-part="address-bar"]')
        .boundingBox();

    expect(box?.height).toBe(parseFloat(scaleTokenValues['mandor-height-address']));
}

/** Finding something opens it where it is read, which is a tab: the searcher raises no modal. */
async function findItem(page: Page): Promise<void> {
    const field = page.getByRole('searchbox', { name: 'Search workspace' });

    await expectHeaderField(page);
    await field.click();
    // The index learns of a new item when the disk reports it, which on a slow machine comes
    // after the first query: asking again is what a person does, so the test asks again.
    // The row of a connection speaks its last message, so the name alone can be ambiguous:
    // the item is asked for by the exact name it goes by.
    await expect(async () => {
        await field.fill('');
        await field.fill('prueba');
        await expect(page.getByRole('option', { name: ITEM, exact: true })).toBeVisible({
            timeout: 2_000,
        });
    }).toPass({ timeout: 20_000 });
    await field.press('Enter');
    await expect(page.getByRole('tab', { name: ITEM })).toHaveCount(0);
    await expect(page.locator('[data-part="breadcrumbs"]')).toContainText(ITEM);
    await expect(page.getByRole('dialog')).toHaveCount(0);
}

async function verifyDisk(sandbox: Sandbox): Promise<void> {
    const tree = diskTree(sandbox.repoRoot);
    const workspace = await defaultWorkspaceDir(sandbox.repoRoot);
    const file = onDisk(
        await itemNamed(tree, `${workspace}/collections`, ['events', ITEM]),
        'the item',
    );
    const item = await tree.read(file);

    expect(item).toContain('{{correlation}}');
    expect(item).not.toContain(VALUE);
}

async function exerciseCollection(page: Page, sandbox: Sandbox, url: string): Promise<void> {
    await expectFirstRun(page);
    await createConnection(page, 'Echo', url, sandbox.repoRoot);
    await createEnvironment(page, 'correlation', VALUE);
    await chooseEnvironment(page);
    await page.getByRole('button', { exact: true, name: 'Connect' }).click();
    await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toBeVisible();
    await expectHeaderField(page);

    await expectUrlField(page);
    await keepAndSend(page);
    await findItem(page);
    await verifyDisk(sandbox);
}

test('keeps, sends, searches and restores the collection path without exposing resolved values', async () => {
    const sandbox = await makeSandbox();
    const echo = await startEchoServer();
    let running: ElectronApplication | undefined;

    try {
        const first = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

        running = first.app;
        await exerciseCollection(first.page, sandbox, echo.url);
        await running.close();
        running = undefined;

        const second = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

        running = second.app;
        await findItem(second.page);
    } finally {
        if (running !== undefined) {
            await running.close();
        }

        await echo.close();
        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
