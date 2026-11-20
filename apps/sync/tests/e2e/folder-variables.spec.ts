import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { environmentsDir, localRepo, PERSONAL, workspaceDir } from './support/disk-names.js';
import { expectEnvironmentOnDisk } from './support/exchange-flow.js';
import { startLocalHttpServer, type LocalHttpServer } from './support/local-http-server.js';
import { createEnvironment, launchSync } from './support/send-flow.js';
import { openSection } from '../../../../packages/ui/tests/support/open-section.js';

// One app and one tree run through every test: each one starts where the last one left.
test.describe.configure({ mode: 'serial' });

let root = '';
let app: ElectronApplication;
let page: Page;
let server: LocalHttpServer;

/** A plain variable as the file of a collection or a folder writes it. */
function variable(name: string, value: string): string {
    return `  - name: ${name}\n    value: ${value}\n    enabled: true\n    secret: false\n`;
}

/** A request that sends `level` and `base` as headers to the echo, written as a file would be. */
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
        '  - key: X-Base',
        '    value: "{{base}}"',
        '    enabled: true',
        '',
    ].join('\n');
}

/**
 * The tree the test reads from: a collection with a folder and a subfolder, `level` declared in
 * the four places and `base` only in the collection, written as a repo arrives from elsewhere.
 */
async function writeTree(): Promise<void> {
    const repo = localRepo(root);
    const collections = join(repo, await workspaceDir(repo, PERSONAL), 'collections');
    const files: Record<string, string> = {
        'collections.yaml': 'order:\n  - api\n',
        'api/collection.yaml': `name: API\norder:\n  - carpeta\n  - raiz\nvariables:\n${variable('level', 'coleccion')}${variable('base', 'b')}`,
        'api/raiz.yaml': request('Raiz'),
        'api/carpeta/folder.yaml': `name: Carpeta\norder:\n  - sub\nvariables:\n${variable('level', 'carpeta')}`,
        'api/carpeta/sub/folder.yaml': `name: Sub\norder:\n  - hondo\nvariables:\n${variable('level', 'subcarpeta')}`,
        'api/carpeta/sub/hondo.yaml': request('Hondo'),
    };

    for (const [path, text] of Object.entries(files)) {
        await mkdir(join(collections, path, '..'), { recursive: true });
        await writeFile(join(collections, path), text, 'utf8');
    }
}

/** Sends the request on screen and answers the headers the echo saw. */
async function sentHeaders(): Promise<{ level: unknown; base: unknown }> {
    const before = server.echoes.length;

    await page.getByRole('button', { name: 'Send' }).click();
    await expect.poll(() => server.echoes.length).toBe(before + 1);

    const seen = server.echoes.at(-1)?.headers ?? {};

    return { level: seen['x-level'], base: seen['x-base'] };
}

async function open(name: string): Promise<void> {
    await page.getByRole('treeitem', { name }).click();
    await expect(page.getByRole('tab', { name })).toBeVisible();
}

test.beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-sync-folder-variables-'));
    server = await startLocalHttpServer();
    await mkdir(join(root, 'origins'), { recursive: true });
    app = await launchSync(root);
    page = await app.firstWindow();

    await expect(page.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();
    await createEnvironment(page, server.origin, { level: 'entorno' });
    await expectEnvironmentOnDisk(await environmentsDir(localRepo(root), PERSONAL), 'entorno');
    await writeTree();
    await expect(page.getByRole('treeitem', { name: 'API' })).toBeVisible();
});

test.afterAll(async () => {
    await app.close();
    await server.close();
    await rm(root, { force: true, maxRetries: 10, recursive: true });
});

test('a request of the subfolder sends the value of the subfolder', async () => {
    for (const folder of ['API', 'Carpeta', 'Sub']) {
        await page.getByRole('treeitem', { name: folder }).click();
        await page.keyboard.press('ArrowRight');
    }

    await open('Hondo');

    expect(await sentHeaders()).toEqual({ level: 'subcarpeta', base: 'b' });
});

test('the popover of the variable names the subfolder and what it overrides', async () => {
    await openSection(page, 'Headers');
    await page.locator('[data-part="request-panel"] [data-variable="level"]').first().hover();

    const popover = page.getByRole('dialog', { name: '{{level}}' });

    await expect(popover.getByText('Defined in Sub')).toBeVisible();
    await expect(popover.getByText('Overrides Carpeta, Local, API')).toBeVisible();
});

test('a request at the root of the collection takes the environment over the collection', async () => {
    await open('Raiz');

    expect(await sentHeaders()).toEqual({ level: 'entorno', base: 'b' });
});

test('a loose request resolves against the environment alone', async () => {
    await page.getByRole('button', { exact: true, name: 'New request' }).first().click();

    const url = page.getByRole('textbox', { name: 'URL' });

    await url.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.insertText(`${server.origin}/echo?level={{level}}&base={{base}}`);

    const before = server.echoes.length;

    await page.getByRole('button', { name: 'Send' }).click();
    await expect.poll(() => server.echoes.length).toBe(before + 1);

    expect(server.echoes.at(-1)?.url).toBe('/echo?level=entorno&base=%7B%7Bbase%7D%7D');
});
