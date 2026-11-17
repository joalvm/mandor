import { rm } from 'node:fs/promises';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { diskTree, itemNamed } from '../../../../tools/workspace/disk-by-name.mjs';
import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import { createEvent, openEvent } from './support/collection-event.js';
import { createConnection, defaultWorkspaceDir, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox, type Sandbox } from './support/launch-app.js';

const NOWHERE = 'wss://127.0.0.1:9/socket';
const COMPOSER = '[data-part="composer"]';
const ITEM = 'Pedido creado';
const PAYLOAD = '{"id": 1}';

async function composeJson(page: Page): Promise<void> {
    await openEvent(page, ITEM);
    await expect(editorLines(page.locator(COMPOSER), 'schema-pane-editor')).toBeVisible();
    await page.locator(`${COMPOSER} [role="combobox"]`).click();
    await page.getByRole('option', { name: 'JSON' }).click();
    await editorLines(page.locator(COMPOSER), 'schema-pane-editor').click();
    await page.keyboard.insertText(PAYLOAD);
    await page.keyboard.press('Control+s');
}

/** The save lands a moment after the keys: the file is read until it carries the format. */
async function expectFormatOnDisk(repoRoot: string): Promise<void> {
    const tree = diskTree(repoRoot);

    await expect
        .poll(
            async () => {
                const workspace = await defaultWorkspaceDir(repoRoot).catch(() => '');
                const file = await itemNamed(tree, `${workspace}/collections`, ['events', ITEM]);

                return file === null ? '' : tree.read(file).catch(() => '');
            },
            { timeout: 15_000 },
        )
        .toContain('payloadType: json');
}

/** First run: the connection, the event, json declared, Ctrl+S, and the file carries it. */
async function composeAndStore(sandbox: Sandbox): Promise<ElectronApplication> {
    const { app, page } = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

    await expectFirstRun(page);
    await createConnection(page, 'menu', NOWHERE, sandbox.repoRoot);
    await createEvent(page, ITEM);
    await composeJson(page);
    await expectFormatOnDisk(sandbox.repoRoot);

    return app;
}

/** Second run: the format comes back from the file, not from view state. */
async function reopenAndExpect(sandbox: Sandbox): Promise<ElectronApplication> {
    const { app, page } = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

    await expectFirstRun(page);
    await page.locator('[data-part="list-row"]', { hasText: 'menu' }).click();
    await openEvent(page, ITEM);
    await expect(editorLines(page.locator(COMPOSER), 'schema-pane-editor')).toBeVisible();
    await expect(page.locator(`${COMPOSER} [role="combobox"]`)).toContainText('JSON');

    return app;
}

test('the declared format of an event survives the tab and the run itself', async () => {
    const sandbox = await makeSandbox();
    let running: ElectronApplication | undefined;

    try {
        running = await composeAndStore(sandbox);
        await running.close();
        running = await reopenAndExpect(sandbox);
    } finally {
        if (running !== undefined) {
            await running.close();
        }

        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
