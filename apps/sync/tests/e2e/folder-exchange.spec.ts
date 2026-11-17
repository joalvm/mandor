import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { localRepo, PERSONAL, workspaceDir } from './support/disk-names.js';
import { exportWorkspace, importWorkspace, openWorkspacesPanel } from './support/exchange-flow.js';
import { applyImport, dropTexts, pickerOf, previewOf } from './support/import-flow.js';
import { launch, makeSandbox } from './support/launch-app.js';
import { startLocalHttpServer, type LocalHttpServer } from './support/local-http-server.js';

// One app runs through every test: each one starts in the workspace the last one left open.
test.describe.configure({ mode: 'serial' });

const SECOND = `${PERSONAL} (2)`;
const FOLDERS = ['Uno', 'Dos', 'Tres'];
const POSTMAN_SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

let root: string;
let exportsDir: string;
let app: ElectronApplication;
let page: Page;
let server: LocalHttpServer;

/** What a level holds in its file: its doc, its `level` and its `X-Level`, all saying its name. */
function settings(level: string): string {
    return [
        `description: Doc de ${level}`,
        'variables:',
        `  - name: level`,
        `    value: ${level}`,
        '    enabled: true',
        '    secret: false',
        'headers:',
        '  - key: X-Level',
        `    value: ${level}`,
        '    enabled: true',
        '',
    ].join('\n');
}

/** A collection with three nested folders, and a request in the deepest that says its `level`. */
async function writeTree(): Promise<void> {
    const repo = localRepo(root);
    const collections = join(repo, await workspaceDir(repo, PERSONAL), 'collections');
    const files: Record<string, string> = {
        'collections.yaml': 'order:\n  - api\n',
        'api/collection.yaml': `name: API\norder:\n  - uno\n${settings('API')}`,
        'api/uno/folder.yaml': `name: Uno\norder:\n  - dos\n${settings('Uno')}`,
        'api/uno/dos/folder.yaml': `name: Dos\norder:\n  - tres\n${settings('Dos')}`,
        'api/uno/dos/tres/folder.yaml': `name: Tres\norder:\n  - hondo\n${settings('Tres')}`,
        'api/uno/dos/tres/hondo.yaml': `kind: request\nname: Hondo\nmethod: GET\nurl: "${server.origin}/echo?level={{level}}"\n`,
    };

    for (const [path, text] of Object.entries(files)) {
        await mkdir(join(collections, path, '..'), { recursive: true });
        await writeFile(join(collections, path), text, 'utf8');
    }
}

/** Unfolds the groups of the tree, one under the other. */
async function unfold(names: readonly string[]): Promise<void> {
    for (const name of names) {
        await page.getByRole('treeitem', { exact: true, name }).click();
        await page.keyboard.press('ArrowRight');
    }
}

/** Opens a request by its row and sends it: what the server saw is the last echo. */
async function send(name: string): Promise<LocalHttpServer['echoes'][number] | undefined> {
    const sent = server.echoes.length;

    await page.getByRole('treeitem', { name }).click();
    await page.getByRole('button', { exact: true, name: 'Send' }).click();
    await expect.poll(() => server.echoes.length).toBe(sent + 1);

    return server.echoes[sent];
}

/** The tab of a folder on its Docs part. */
async function openFolderDocs(name: string): Promise<void> {
    const row = page.getByRole('treeitem', { exact: true, name });

    await row.hover();
    await row.getByRole('button', { name: 'Row options' }).click();
    await page.getByRole('menuitem', { exact: true, name: 'Settings' }).click();
    await expect(page.getByRole('tab', { exact: true, name })).toBeVisible();
    await page.getByRole('tab', { exact: true, name: 'Docs' }).click();
}

/** A folder of the first level shows unfolded: its row then says what its format loses. */
async function expectNoteOn(folder: string, words: string): Promise<void> {
    const tree = page.locator('[data-part="choice-tree"]');

    await tree
        .getByRole('treeitem', { exact: true, name: folder })
        .locator('[data-part="row-note"]')
        .hover();
    await expect(page.getByRole('tooltip')).toContainText(words);
    await page.getByRole('button', { exact: true, name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
}

/** The token is a reference: a secret written in a Postman document does not enter. */
function postmanCollection(name: string, variables: readonly object[]): string {
    return JSON.stringify({
        info: { name, schema: POSTMAN_SCHEMA },
        auth: {
            type: 'bearer',
            bearer: [{ key: 'token', value: '{{clave}}', type: 'string' }],
        },
        variable: [{ key: 'clave', value: `clave-${name}` }, ...variables],
        item: [
            {
                name: `Pedir ${name}`,
                request: { method: 'GET', url: `${server.origin}/echo?stage={{stage}}` },
            },
        ],
    });
}

function postmanEnvironment(name: string): string {
    return JSON.stringify({
        name,
        values: [{ key: 'stage', value: name, enabled: true, type: 'default' }],
        _postman_variable_scope: 'environment',
    });
}

async function chooseEnvironment(name: string): Promise<void> {
    await pickerOf(page).click();
    await page.getByRole('menuitem', { exact: true, name }).click();
    await expect(pickerOf(page)).toContainText(name);
}

test.beforeAll(async () => {
    const sandbox = await makeSandbox();

    root = sandbox.root;
    exportsDir = join(root, 'exports');
    await mkdir(join(root, 'origins'), { recursive: true });
    await mkdir(exportsDir, { recursive: true });
    server = await startLocalHttpServer();

    const launched = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot, {
        MANDOR_SAVE_DIR: exportsDir,
    });

    app = launched.app;
    page = launched.page;
    await expect(page.getByRole('button', { exact: true, name: PERSONAL })).toBeVisible();
    await writeTree();
    await expect(page.getByRole('treeitem', { exact: true, name: 'API' })).toBeVisible();
});

test.afterAll(async () => {
    await app.close();
    await server.close();
    await rm(root, { force: true, maxRetries: 10, recursive: true });
});

test('three nested folders go out to Mandor and come back whole in a new workspace', async () => {
    await openWorkspacesPanel(page, PERSONAL);

    const exported = await exportWorkspace(
        page,
        { file: 'personal.mandor.yaml', name: PERSONAL },
        exportsDir,
    );

    await openWorkspacesPanel(page, PERSONAL);
    await importWorkspace(page, exported);
    await expect(page.getByRole('button', { exact: true, name: SECOND })).toBeVisible();
    await expect(page.getByRole('treeitem', { exact: true, name: 'API' })).toBeVisible();
    await unfold(['API', ...FOLDERS]);
});

test('the request of the deepest folder leaves with its level, in the url and in the header', async () => {
    const echo = await send('Hondo');

    expect(echo?.url).toContain('level=Tres');
    expect(echo?.headers['x-level']).toBe('Tres');
});

test('the tab of each folder shows the doc that came back with it', async () => {
    for (const name of FOLDERS) {
        await openFolderDocs(name);
        await expect(
            page.locator('[data-part="folder-docs"]:visible').getByText(`Doc de ${name}`),
        ).toBeVisible();
    }
});

test('the export says what Postman does not keep of a folder, on the row of that folder', async () => {
    await openWorkspacesPanel(page, SECOND);
    await page.getByRole('button', { name: 'Export a workspace' }).click();
    await page.locator('[data-part="export-format"]').click();
    await page
        .locator('[role^="menuitem"]')
        .filter({ hasText: /^Postman$/u })
        .click();
    await expectNoteOn('Uno', 'Postman does not resolve the variables of a folder');
});

test('two Postman collections send each its auth, and the environment rules their variable', async () => {
    await openWorkspacesPanel(page, SECOND);
    await page.getByRole('button', { name: 'Import a workspace' }).click();
    await dropTexts(page, [
        {
            content: postmanCollection('Alfa', [{ key: 'stage', value: 'coleccion' }]),
            name: 'alfa.postman_collection.json',
        },
        { content: postmanCollection('Beta', []), name: 'beta.postman_collection.json' },
        { content: postmanEnvironment('Prod'), name: 'prod.postman_environment.json' },
        { content: postmanEnvironment('Dev'), name: 'dev.postman_environment.json' },
    ]);
    await expect(previewOf(page)).toBeVisible();
    await applyImport(page);
    await expect(page.getByRole('treeitem', { exact: true, name: 'Alfa' })).toBeVisible();
    await unfold(['Alfa', 'Beta']);

    await chooseEnvironment('Prod');

    const inProd = await send('Pedir Alfa');

    expect(inProd?.url).toContain('stage=Prod');
    expect(inProd?.headers.authorization).toBe('Bearer clave-Alfa');

    await chooseEnvironment('Dev');

    const inDev = await send('Pedir Alfa');
    const other = await send('Pedir Beta');

    expect(inDev?.url).toContain('stage=Dev');
    expect(other?.headers.authorization).toBe('Bearer clave-Beta');
});
