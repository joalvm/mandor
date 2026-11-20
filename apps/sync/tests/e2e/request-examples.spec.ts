import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import { itemText, localRepo, PERSONAL } from './support/disk-names.js';
import { startLocalHttpServer, type LocalHttpServer } from './support/local-http-server.js';
import { openSection } from '../../../../packages/ui/tests/support/open-section.js';
import {
    aim,
    createEnvironment,
    createRequestRow,
    launchSync,
    nameNewRequest,
} from './support/send-flow.js';

test.describe.configure({ mode: 'serial' });

let root = '';
let app: ElectronApplication;
let page: Page;
let server: LocalHttpServer;

test.beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-sync-examples-'));
    server = await startLocalHttpServer();
    await mkdir(join(root, 'origins'), { recursive: true });
    app = await launchSync(root);
    page = await app.firstWindow();
    // Every section of the example in view: going through the menu of the strip is not what this
    // spec is about.
    await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.setSize(1600, 900);
    });

    await expect(page.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();
    await createEnvironment(page, server.origin);
    await createRequestRow(page);
    await page.getByRole('treeitem', { name: 'crear pedido' }).click();
});

test.afterAll(async () => {
    await app.close();
    await server.close();
    await rm(root, { force: true, maxRetries: 10, recursive: true });
});

function exampleRows() {
    return page.locator('[data-part="collection-example-row"]');
}

/** The text of the file of the request on disk, found by the names the tree shows for it. */
function requestFile(): Promise<string> {
    return itemText(localRepo(root), PERSONAL, ['pedidos', 'crear pedido']);
}

test('a response kept as an example shows up under its request, with its code', async () => {
    await aim(page, 'GET', '/echo');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByRole('button', { name: 'Save response as example' }).click();

    await expect(exampleRows()).toHaveCount(1);
    await expect(exampleRows().first()).toContainText('200');
    await expect(page.getByRole('tab', { name: /200/u })).toBeVisible();
});

test('editing the body of the example and saving it writes it to the file of the request', async () => {
    await editorLines(page, 'code-editor').first().click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.insertText('{"kept":true}');
    await page.keyboard.press('ControlOrMeta+s');

    await expect.poll(requestFile).toContain('kept');
});

test('F2 renames the example in the tree and its tab follows', async () => {
    await exampleRows().first().click();
    await page.keyboard.press('F2');

    const name = page.getByRole('textbox', { name: 'New name' });

    await name.fill('Alta');
    await name.press('Enter');

    await expect(exampleRows().first()).toContainText('Alta');
    await expect(page.getByRole('tab', { name: /Alta/u })).toBeVisible();
});

test('Ctrl+D duplicates the example right behind it', async () => {
    await exampleRows().first().click();
    await page.keyboard.press('ControlOrMeta+d');

    await expect(exampleRows()).toHaveCount(2);
    await expect(exampleRows().nth(1)).toContainText('Alta copy');
});

test('Delete takes the example out of its request', async () => {
    await exampleRows().nth(1).click();
    await page.keyboard.press('Delete');

    const confirm = page.getByRole('alertdialog', { name: 'Delete from the collections' });

    await expect(confirm).toContainText('Alta copy');
    await confirm.getByRole('button', { name: 'Delete' }).click();

    await expect(exampleRows()).toHaveCount(1);
    await expect(exampleRows().first()).toContainText('Alta');
});

test('the answer received, accepted whole, is kept in the example once saved', async () => {
    await exampleRows().first().click();
    const response = page.locator('[data-part="example-response"]');

    await openSection(response, /^Body/u);
    await editorLines(response, 'code-editor').click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.insertText('{"expected":true}');
    // The editor closes the quote and the brace it was given: take back what it added. The text is
    // one line, and End reaches its end on every system; the end of the document is another key
    // on macOS.
    await page.keyboard.press('End');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await openSection(page, /^Differences/u);
    await page.keyboard.press('ControlOrMeta+Enter');

    await expect(page.getByText('Received', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Accept received' }).click();
    await expect(page.getByRole('heading', { name: 'No differences' })).toBeVisible();

    // The button that had the focus is gone with the difference: the keys need a place in the panel.
    await page.getByRole('tab', { name: /^Differences/u }).focus();
    await page.keyboard.press('ControlOrMeta+s');

    await expect.poll(requestFile).toContain('/echo');
});

test('a schema written from the body is kept in the file and lists what the next send breaks', async () => {
    const response = page.locator('[data-part="example-response"]');

    await openSection(response, /^Body/u);
    await editorLines(response, 'code-editor').click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.insertText('{"extra":true}');
    // The editor closes the quote and the brace it was given: take back what it added. The text is
    // one line, and End reaches its end on every system; the end of the document is another key
    // on macOS.
    await page.keyboard.press('End');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');

    await openSection(response, /^Schema/u);
    await response.getByRole('button', { name: 'Generate from the body' }).click();
    await expect(response.getByText('Response 200 of this example', { exact: true })).toBeVisible();

    await openSection(response, /^Differences/u);
    await page.keyboard.press('ControlOrMeta+Enter');
    await expect(
        response.getByRole('tab', { name: /^Schema/u }).locator('[data-part="tabs-broken"]'),
    ).toBeVisible();
    await openSection(response, /^Schema/u);

    await expect(
        response.getByRole('region', { name: /^Received 200 · \d+ problems?$/u }),
    ).toBeVisible();

    await page.getByRole('tab', { name: /^Differences/u }).focus();
    await page.keyboard.press('ControlOrMeta+s');

    await expect.poll(requestFile).toMatch(/^examples:[\s\S]*^\s+schema: /mu);
});

test('taking an answer the schema still refuses says so and opens the schema', async () => {
    await openSection(page, /^Differences/u);
    await page.getByRole('button', { name: 'Accept received' }).click();

    await expect(page.getByText('Values accepted', { exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Schema/u })).toHaveAttribute(
        'aria-selected',
        'true',
    );
});

test('an example dragged onto another request moves there, and its tab goes with it', async () => {
    const folder = page.getByRole('treeitem', { name: 'pedidos' });

    await folder.getByRole('button', { name: 'Row options' }).click();
    await page.getByRole('menuitem', { name: 'New request' }).click();
    await nameNewRequest(page, 'listar pedidos');

    const before = await exampleRows().count();
    const moved = exampleRows().first();
    const name = (await moved.locator('[data-part="row-label"]').textContent()) ?? '';

    await moved.dragTo(page.getByRole('treeitem', { name: 'listar pedidos' }));

    await expect
        .poll(() => itemText(localRepo(root), PERSONAL, ['pedidos', 'listar pedidos']))
        .toContain(name);
    await expect.poll(requestFile).not.toContain(`name: ${name}`);
    await expect(exampleRows()).toHaveCount(before);
    await expect(page.getByRole('tab', { name: new RegExp(name, 'u') })).toBeVisible();
});
