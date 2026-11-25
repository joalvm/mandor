import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { localRepo, PERSONAL, workspaceDir } from './support/disk-names.js';
import { startLocalHttpServer, type LocalHttpServer } from './support/local-http-server.js';
import { createEnvironment, launchSync } from './support/send-flow.js';
import { writeRowAt } from './support/variable-row.js';

// One app and one tree run through every test: each one starts where the last one left.
test.describe.configure({ mode: 'serial' });

let root = '';
let collections = '';
let app: ElectronApplication;
let page: Page;
let server: LocalHttpServer;

/** A request that sends `level` as a header to the echo, written as a file would be. */
function request(name: string): string {
    return [
        'kind: request',
        `name: ${name}`,
        'method: GET',
        'url: "{{baseUrl}}/echo"',
        'headers:',
        '  - key: X-Level',
        '    value: "{{level}}"',
        '    enabled: true',
        '',
    ].join('\n');
}

/**
 * A collection with one request at its root and a folder with one request, written as a repo
 * arrives from elsewhere: each settings file carries a key Mandor does not know.
 */
async function writeTree(): Promise<void> {
    const repo = localRepo(root);

    collections = join(repo, await workspaceDir(repo, PERSONAL), 'collections');

    const files: Record<string, string> = {
        'collections.yaml': 'order:\n  - api\n',
        'api/collection.yaml': 'name: API\ncustom: kept\norder:\n  - carpeta\n  - raiz\n',
        'api/raiz.yaml': request('Raiz'),
        'api/carpeta/folder.yaml': 'name: Carpeta\nextra: kept\norder:\n  - hondo\n',
        'api/carpeta/hondo.yaml': request('Hondo'),
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

    await writeRowAt(
        table.getByRole('textbox', { exact: true, name: 'Key' }).nth(0),
        table.getByRole('textbox', { exact: true, name: 'Value' }).nth(0),
        name,
        value,
    );
}

/** Sends the request named, from its tab, and answers the level the echo saw. */
async function sentLevel(name: string): Promise<unknown> {
    await page.getByRole('treeitem', { exact: true, name }).click();
    await expect(page.getByRole('tab', { name })).toBeVisible();

    const before = server.echoes.length;

    await page.getByRole('button', { name: 'Send' }).click();
    await expect.poll(() => server.echoes.length).toBe(before + 1);

    return server.echoes.at(-1)?.headers['x-level'];
}

test.beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-sync-folder-settings-'));
    server = await startLocalHttpServer();
    await mkdir(join(root, 'origins'), { recursive: true });
    app = await launchSync(root);
    page = await app.firstWindow();

    await expect(page.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();
    await createEnvironment(page, server.origin, { level: 'entorno' });
    await writeTree();
    await page.getByRole('treeitem', { exact: true, name: 'API' }).click();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('treeitem', { exact: true, name: 'Carpeta' })).toBeVisible();
});

test.afterAll(async () => {
    await app.close();
    await server.close();
    await rm(root, { force: true, maxRetries: 10, recursive: true });
});

test('the words of a folder are kept and come back when its tab opens again', async () => {
    await openSettings('Carpeta');

    const docs = page.locator('[data-part="folder-docs"]');

    await docs.getByRole('button', { name: 'Write' }).click();
    await docs.locator('.view-lines').first().click();
    await page.keyboard.insertText('Pedidos del cliente');
    await expect
        .poll(() => settingsFile('api/carpeta/folder.yaml'))
        .toContain('description: Pedidos del cliente');

    const tab = page.getByRole('tab', { exact: true, name: 'Carpeta' });

    // The close of a tab is only there while the pointer is on it.
    await tab.hover();
    await tab.getByRole('button', { name: 'Close tab' }).click();
    await expect(tab).toHaveCount(0);
    await openSettings('Carpeta');
    await expect(docs.getByText('Pedidos del cliente')).toBeVisible();
});

test('a variable of the folder overrides the environment for what the folder holds', async () => {
    await declare('level', 'carpeta');
    await expect.poll(() => settingsFile('api/carpeta/folder.yaml')).toContain('value: carpeta');
    await expect(
        page.locator('[data-part="folder-variable-notes"]').getByText('Overrides New environment'),
    ).toBeVisible();
    await page.getByRole('treeitem', { exact: true, name: 'Carpeta' }).click();
    await page.keyboard.press('ArrowRight');

    expect(await sentLevel('Hondo')).toBe('carpeta');
});

test('a variable of the collection gives way to the environment', async () => {
    await openSettings('API');
    await declare('level', 'coleccion');
    await expect.poll(() => settingsFile('api/collection.yaml')).toContain('value: coleccion');
    await expect(
        page
            .locator('[data-part="folder-variable-notes"]')
            .getByText('Overridden by New environment'),
    ).toBeVisible();

    expect(await sentLevel('Raiz')).toBe('entorno');
});

test('the files keep what Mandor wrote and what it does not know', async () => {
    const folder = await settingsFile('api/carpeta/folder.yaml');
    const collection = await settingsFile('api/collection.yaml');

    expect(folder).toContain('description: Pedidos del cliente');
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
    await page.getByRole('textbox', { name: 'New name' }).fill('Pedidos');
    await page.getByRole('textbox', { name: 'New name' }).press('Enter');

    await expect(page.getByRole('tab', { exact: true, name: 'Pedidos' })).toBeVisible();
    await page.getByRole('tab', { exact: true, name: 'Docs' }).click();
    await expect(
        page.locator('[data-part="folder-docs"]').getByText('Pedidos del cliente'),
    ).toBeVisible();
});
