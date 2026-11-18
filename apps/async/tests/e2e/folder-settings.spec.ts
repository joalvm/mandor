import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { startEchoServer } from '../../../../packages/transport-async/tests/support/echo-server.js';
import { composerOf, openEvent } from './support/collection-event.js';
import { chooseEnvironment, createEnvironment, writeVariableRow } from './support/environment.js';
import { createConnection, defaultWorkspaceDir, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox, type Sandbox } from './support/launch-app.js';

// One app and one tree run through every test: each one starts where the last one left.
test.describe.configure({ mode: 'serial' });

let sandbox: Sandbox;
let collections = '';
let app: ElectronApplication;
let page: Page;
let echo: Awaited<ReturnType<typeof startEchoServer>>;

/** An event whose payload is the variable `level` alone, written as a file would be. */
function event(name: string): string {
    return `kind: message\nname: ${name}\npayloadType: text\npayload: "{{level}}"\n`;
}

/**
 * A collection with one event at its root and a folder with one event, written as a repo
 * arrives from elsewhere: each settings file carries a key Mandor does not know.
 */
async function writeTree(): Promise<void> {
    const workspace = await defaultWorkspaceDir(sandbox.repoRoot);

    collections = join(sandbox.repoRoot, workspace, 'collections');

    const files: Record<string, string> = {
        'collections.yaml': 'order:\n  - api\n',
        'api/collection.yaml': 'name: API\ncustom: kept\norder:\n  - carpeta\n  - raiz\n',
        'api/raiz.yaml': event('Raiz'),
        'api/carpeta/folder.yaml': 'name: Carpeta\nextra: kept\norder:\n  - hondo\n',
        'api/carpeta/hondo.yaml': event('Hondo'),
    };

    for (const [path, text] of Object.entries(files)) {
        await mkdir(join(collections, path, '..'), { recursive: true });
        await writeFile(join(collections, path), text, 'utf8');
    }
}

function settingsFile(path: string): Promise<string> {
    return readFile(join(collections, path), 'utf8').catch(() => '');
}

/** Opens the tab of a collection or a folder from the menu of its row. */
async function openSettings(name: string): Promise<void> {
    const row = page.getByRole('treeitem', { exact: true, name });

    // Only hovered: a click on the row of a group folds or unfolds it.
    await row.hover();
    await row.getByRole('button', { name: 'Row options' }).click();
    await page.getByRole('menuitem', { exact: true, name: 'Settings' }).click();
    await expect(page.getByRole('tab', { exact: true, name })).toBeVisible();
}

/** Declares one variable in the section of the tab on screen. */
async function declare(name: string, value: string): Promise<void> {
    await page.getByRole('tab', { exact: true, name: 'Variables' }).click();

    const table = page.locator('[data-part="folder-variables"]');

    await writeVariableRow(table, 0, name, value);
}

/** Loads the event named into the composer of the connection and sends it. */
async function send(name: string): Promise<void> {
    await page.getByRole('tab', { exact: true, name: 'Eco' }).click();
    await openEvent(page, name);
    await expect(composerOf(page)).toContainText('{{level}}');
    await page.getByRole('button', { exact: true, name: 'Send' }).click();
}

/** The echo of a payload on the connection in front: the activity lists the newest first. */
function lastEcho() {
    return page.locator('[data-part="activity-row"][data-direction="in"]:visible').first();
}

test.beforeAll(async () => {
    sandbox = await makeSandbox();
    echo = await startEchoServer();

    const launched = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

    app = launched.app;
    page = launched.page;
    await expectFirstRun(page);
    await createEnvironment(page, 'host', new URL(echo.url).host);
    await page
        .locator('[data-part="titlebar"]')
        .getByRole('button', { exact: true, name: 'Manage environments' })
        .click();

    const dialog = page.getByRole('dialog', { name: 'Environments' });

    await writeVariableRow(dialog, 1, 'level', 'entorno');
    await dialog.getByRole('button', { exact: true, name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);
    await writeTree();
    await page.getByRole('treeitem', { exact: true, name: 'API' }).click();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('treeitem', { exact: true, name: 'Carpeta' })).toBeVisible();
    await createConnection(page, 'Eco', 'ws://{{host}}/', sandbox.repoRoot);
    await chooseEnvironment(page);
    await page.getByRole('button', { exact: true, name: 'Connect' }).click();
    await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toBeVisible();
});

test.afterAll(async () => {
    await app.close();
    await echo.close();
    await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
});

test('the words of a folder are kept and come back when its tab opens again', async () => {
    await openSettings('Carpeta');

    const docs = page.locator('[data-part="folder-docs"]');

    await docs.getByRole('button', { name: 'Write' }).click();
    await docs.locator('.view-lines').first().click();
    await page.keyboard.insertText('Eventos del cliente');
    await expect
        .poll(() => settingsFile('api/carpeta/folder.yaml'))
        .toContain('description: Eventos del cliente');

    const tab = page.getByRole('tab', { exact: true, name: 'Carpeta' });

    // The close of a tab is only there while the pointer is on it.
    await tab.hover();
    await tab.getByRole('button', { name: 'Close tab' }).click();
    await expect(tab).toHaveCount(0);
    await openSettings('Carpeta');
    await expect(docs.getByText('Eventos del cliente')).toBeVisible();
});

test('a variable of the folder overrides the environment for what the folder holds', async () => {
    await declare('level', 'carpeta');
    await expect.poll(() => settingsFile('api/carpeta/folder.yaml')).toContain('value: carpeta');
    await expect(
        page.locator('[data-part="folder-variable-notes"]').getByText('Overrides Local'),
    ).toBeVisible();
    await page.getByRole('treeitem', { exact: true, name: 'Carpeta' }).click();
    await page.keyboard.press('ArrowRight');

    await send('Hondo');
    await expect(lastEcho()).toContainText('carpeta');
});

test('a variable of the collection gives way to the environment', async () => {
    await openSettings('API');
    await declare('level', 'coleccion');
    await expect.poll(() => settingsFile('api/collection.yaml')).toContain('value: coleccion');
    await expect(
        page.locator('[data-part="folder-variable-notes"]').getByText('Overridden by Local'),
    ).toBeVisible();

    await send('Raiz');
    await expect(lastEcho()).toContainText('entorno');
});

test('the files keep what Mandor wrote and what it does not know', async () => {
    const folder = await settingsFile('api/carpeta/folder.yaml');
    const collection = await settingsFile('api/collection.yaml');

    expect(folder).toContain('description: Eventos del cliente');
    expect(folder).toContain('name: level');
    expect(folder).toContain('extra: kept');
    expect(collection).toContain('name: level');
    expect(collection).toContain('custom: kept');
});

test('renaming the folder leaves its tab open, under the new name', async () => {
    await openSettings('Carpeta');

    const row = page.getByRole('treeitem', { exact: true, name: 'Carpeta' });

    await row.getByRole('button', { name: 'Row options' }).click();
    await page.getByRole('menuitem', { exact: true, name: 'Rename' }).click();
    await page.getByRole('textbox', { name: 'New name' }).fill('Eventos');
    await page.getByRole('textbox', { name: 'New name' }).press('Enter');

    await expect(page.getByRole('tab', { exact: true, name: 'Eventos' })).toBeVisible();
    await page.getByRole('tab', { exact: true, name: 'Docs' }).click();
    await expect(
        page.locator('[data-part="folder-docs"]').getByText('Eventos del cliente'),
    ).toBeVisible();
});
