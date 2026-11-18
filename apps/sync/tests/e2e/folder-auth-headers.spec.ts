import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Locator, type Page } from '@playwright/test';

import { localRepo, PERSONAL, workspaceDir } from './support/disk-names.js';
import { startLocalHttpServer, type LocalHttpServer } from './support/local-http-server.js';
import { createEnvironment, launchSync } from './support/send-flow.js';
import { variableRow, writeNewRow } from './support/variable-row.js';
import { openSection } from './support/open-section.js';

const TOKEN = 't0k3n-del-entorno';

// One app and one tree run through every test: each one starts where the last one left.
test.describe.configure({ mode: 'serial' });

let root = '';
let collections = '';
let app: ElectronApplication;
let page: Page;
let server: LocalHttpServer;

/** A collection, a folder inside it and one request in the folder, as a repo arrives. */
async function writeTree(): Promise<void> {
    const repo = localRepo(root);

    collections = join(repo, await workspaceDir(repo, PERSONAL), 'collections');

    const files: Record<string, string> = {
        'collections.yaml': 'order:\n  - api\n',
        'api/collection.yaml': 'name: API\norder:\n  - carpeta\n',
        'api/carpeta/folder.yaml': 'name: Carpeta\norder:\n  - hondo\n',
        'api/carpeta/hondo.yaml': [
            'kind: request',
            'name: Hondo',
            'method: GET',
            'url: "{{baseUrl}}/echo"',
            '',
        ].join('\n'),
    };

    for (const [path, text] of Object.entries(files)) {
        await mkdir(join(collections, path, '..'), { recursive: true });
        await writeFile(join(collections, path), text, 'utf8');
    }
}

function settingsFile(path: string): Promise<string> {
    return readFile(join(collections, path), 'utf8').catch(() => '');
}

/** Picks an entry of the menu of a group's row. Only hovered: a click on it folds or unfolds. */
async function fromRowMenu(name: string, entry: string): Promise<void> {
    const row = page.getByRole('treeitem', { exact: true, name });

    await row.hover();
    await row.getByRole('button', { name: 'Row options' }).click();
    await page.getByRole('menuitem', { exact: true, name: entry }).click();
    await expect(page.getByRole('tab', { exact: true, name })).toBeVisible();
}

/** The table of headers of the group whose tab opens from its row. */
async function folderHeaders(name: string): Promise<Locator> {
    await fromRowMenu(name, 'Settings');
    await page.getByRole('tab', { exact: true, name: 'Headers' }).click();

    return page.locator('[data-part="folder-headers"]');
}

/** Sends the request from its tab and answers what the echo saw. */
async function sendHondo(): Promise<Record<string, unknown>> {
    await page.getByRole('treeitem', { exact: true, name: 'Hondo' }).click();
    await expect(page.getByRole('tab', { name: 'Hondo' })).toBeVisible();

    const before = server.echoes.length;

    await page.getByRole('button', { name: 'Send' }).click();
    await expect.poll(() => server.echoes.length).toBe(before + 1);

    return server.echoes.at(-1)?.headers ?? {};
}

test.beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-sync-folder-auth-headers-'));
    server = await startLocalHttpServer();
    await mkdir(join(root, 'origins'), { recursive: true });
    app = await launchSync(root);
    page = await app.firstWindow();

    await expect(page.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();
    await createEnvironment(page, server.origin, { token: TOKEN });
    await writeTree();
    await page.getByRole('treeitem', { exact: true, name: 'API' }).click();
    await page.keyboard.press('ArrowRight');
    await page.getByRole('treeitem', { exact: true, name: 'Carpeta' }).click();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('treeitem', { exact: true, name: 'Hondo' })).toBeVisible();
});

test.afterAll(async () => {
    await app.close();
    await server.close();
    await rm(root, { force: true, maxRetries: 10, recursive: true });
});

test('the closest level wins the header, and the request says who lost', async () => {
    await writeNewRow(await folderHeaders('API'), 'X-Team', 'a');
    await expect.poll(() => settingsFile('api/collection.yaml')).toContain('X-Team');
    await writeNewRow(await folderHeaders('Carpeta'), 'X-Team', 'b');
    await expect.poll(() => settingsFile('api/carpeta/folder.yaml')).toContain('X-Team');

    const seen = await sendHondo();

    expect(seen['x-team']).toBe('b');

    await openSection(page, 'Headers');
    await page.getByRole('button', { name: 'Inherited (2)' }).click();

    await expect(page.getByText('overridden by Carpeta')).toBeVisible();
});

test('the auth chosen from the row of a folder goes out resolved', async () => {
    await fromRowMenu('Carpeta', 'Authorization…');

    const auth = page.locator('[data-part="folder-auth"]');

    await auth.getByRole('combobox', { name: 'Type' }).click();
    await page.getByRole('option', { name: 'Bearer' }).click();

    // The template arrives as one insertion: the field closes `{{}}` on its own while typing.
    const token = auth.getByRole('textbox', { name: 'Token' });

    await token.click();
    await page.keyboard.insertText('{{token}}');
    await expect.poll(() => settingsFile('api/carpeta/folder.yaml')).toContain('{{token}}');

    const seen = await sendHondo();

    expect(seen['authorization']).toBe(`Bearer ${TOKEN}`);
});

test('the generated code carries what reached the server', async () => {
    await page.getByRole('button', { name: 'Code' }).click();

    const dialog = page.getByRole('dialog', { name: 'Request as code' });

    await expect(dialog).toContainText('X-Team: b');
    await dialog.getByRole('button', { exact: true, name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);
});

test('an inherited header switched off does not reach the server', async () => {
    const table = await folderHeaders('API');

    await writeNewRow(table, 'X-Off', 'si');
    await expect.poll(() => settingsFile('api/collection.yaml')).toContain('X-Off');
    await variableRow(table, 'X-Off').getByRole('checkbox', { name: 'Send this entry' }).click();
    await expect.poll(() => settingsFile('api/collection.yaml')).toContain('enabled: false');

    const seen = await sendHondo();

    expect(seen['x-off']).toBeUndefined();
});

test('a line of the request itself wins over every level', async () => {
    await page.getByRole('treeitem', { exact: true, name: 'Hondo' }).click();
    await openSection(page, 'Headers');
    await writeNewRow(page.getByRole('tabpanel', { name: 'Headers' }).first(), 'X-Team', 'c');

    const seen = await sendHondo();

    expect(seen['x-team']).toBe('c');
    await expect(page.getByText('overridden by this request').first()).toBeVisible();
});
