import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import { itemText, localRepo, PERSONAL } from './support/disk-names.js';
import { launch, makeSandbox } from './support/launch-app.js';
import { nameNewRequest, saveRequest } from './support/send-flow.js';
import { writeNewRow } from './support/variable-row.js';
import { openSection } from './support/open-section.js';

const ITEM_NAMES = ['pedidos', 'crear pedido'];
const BODY = '{ "cliente": "{{clienteId}}", "total": 42 }';

/** One request, made the way the user makes it: named in the tree, written in its tab. */
async function createRequest(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'New collection' }).click();
    await page.getByRole('textbox', { name: 'New name' }).fill('pedidos');
    await page.getByRole('textbox', { name: 'New name' }).press('Enter');

    const folder = page.getByRole('treeitem', { name: 'pedidos' });

    await expect(folder).toBeVisible();
    await folder.getByRole('button', { name: 'Row options' }).click();
    await page.getByRole('menuitem', { name: 'New request' }).click();
    await nameNewRequest(page, 'crear pedido');
    await page.getByRole('treeitem', { name: 'crear pedido' }).click();

    await expect(page.getByRole('tab', { name: 'crear pedido' })).toBeVisible();
}

async function writeRequest(page: Page): Promise<void> {
    await page.getByRole('button', { name: /^Method / }).click();
    await page.getByRole('menuitem', { name: 'POST' }).click();

    const url = page.getByRole('textbox', { name: 'URL' });

    await url.click();
    await page.keyboard.insertText('{{baseUrl}}/pedidos');

    await openSection(page, 'Headers');
    await writeNewRow(page.getByRole('tabpanel', { name: 'Headers' }).first(), 'X-Tag', 'quiet');
    await page.getByRole('checkbox', { name: 'Send this entry' }).click();

    await openSection(page, 'Body');
    await page.getByRole('combobox', { name: 'Body type' }).click();
    await page.getByRole('option', { name: 'JSON' }).click();
    await expect(page.locator('[data-part="code-editor"]')).toBeVisible();

    await editorLines(page, 'code-editor').click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.insertText(BODY);
    await saveRequest(page);
}

/** The header is kept switched off: switching a line off is not erasing it. */
async function expectRequestOnDisk(root: string): Promise<void> {
    await expect
        .poll(() => itemText(localRepo(root), PERSONAL, ITEM_NAMES), { timeout: 15_000 })
        .toContain('enabled: false');
}

async function expectRequestInTheApp(page: Page): Promise<void> {
    await page.getByRole('treeitem', { name: 'crear pedido' }).click();
    await expect(page.getByRole('tab', { name: 'crear pedido' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Method / })).toHaveText('POST');
    await expect(page.getByRole('textbox', { name: 'URL' })).toContainText('{{baseUrl}}/pedidos');

    await openSection(page, 'Headers');
    await expect(page.getByRole('textbox', { exact: true, name: 'Key' }).first()).toHaveText(
        'X-Tag',
    );
    await expect(page.getByRole('checkbox', { name: 'Send this entry' })).not.toBeChecked();

    await openSection(page, 'Body');
    await expect(page.locator('[data-part="code-editor"] .view-lines')).toContainText('"cliente"');
}

/** The window comes back with the request as it was, and the file says what it keeps. */
async function expectSurvival(page: Page, root: string): Promise<void> {
    await expect(page.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();
    await expectRequestInTheApp(page);

    const yaml = await itemText(localRepo(root), PERSONAL, ITEM_NAMES);

    expect(yaml).toContain('kind: request');
    expect(yaml).toContain('X-Tag');
}

test('a request of the collection survives the window: its tab comes back as written', async () => {
    const { defaultRepoRoot, root, userDataDir } = await makeSandbox();
    let running: ElectronApplication | undefined;

    try {
        await mkdir(join(root, 'origins'), { recursive: true });
        const opened = await launch(userDataDir, defaultRepoRoot);
        const first = opened.page;

        running = opened.app;

        await expect(first.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();
        await createRequest(first);
        await writeRequest(first);
        await expectRequestOnDisk(root);

        await running.close();
        running = undefined;

        const reopened = await launch(userDataDir, defaultRepoRoot);

        running = reopened.app;

        await expectSurvival(reopened.page, root);
    } finally {
        await running?.close();
        await rm(root, { force: true, maxRetries: 10, recursive: true });
    }
});
