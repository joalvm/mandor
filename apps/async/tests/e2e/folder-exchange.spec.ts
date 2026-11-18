import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { startEchoServer } from '../../../../packages/transport-async/tests/support/echo-server.js';
import { composerOf, openEvent } from './support/collection-event.js';
import {
    createConnection,
    DEFAULT_WORKSPACE,
    defaultWorkspaceDir,
    expectFirstRun,
} from './support/first-run.js';
import { launch, makeSandbox, type Sandbox } from './support/launch-app.js';
import { exportWorkspace, importWorkspace, openWorkspacesPanel } from './support/workspace-doc.js';

// One app runs through every test: each one starts in the workspace the last one left open.
test.describe.configure({ mode: 'serial' });

const SECOND = `${DEFAULT_WORKSPACE} (2)`;
const FOLDERS = ['Uno', 'Dos', 'Tres'];

let sandbox: Sandbox;
let exportsDir: string;
let app: ElectronApplication;
let page: Page;
let echo: Awaited<ReturnType<typeof startEchoServer>>;

/** What a level holds in its file: its doc and its `level`, both saying its name. */
function settings(level: string): string {
    return [
        `description: Doc de ${level}`,
        'variables:',
        '  - name: level',
        `    value: ${level}`,
        '    enabled: true',
        '    secret: false',
        '',
    ].join('\n');
}

/** A collection with three nested folders, and an event in the deepest that says its `level`. */
async function writeTree(): Promise<void> {
    const workspace = await defaultWorkspaceDir(sandbox.repoRoot);
    const collections = join(sandbox.repoRoot, workspace, 'collections');
    const files: Record<string, string> = {
        'collections.yaml': 'order:\n  - api\n',
        'api/collection.yaml': `name: API\norder:\n  - uno\n${settings('API')}`,
        'api/uno/folder.yaml': `name: Uno\norder:\n  - dos\n${settings('Uno')}`,
        'api/uno/dos/folder.yaml': `name: Dos\norder:\n  - tres\n${settings('Dos')}`,
        'api/uno/dos/tres/folder.yaml': `name: Tres\norder:\n  - hondo\n${settings('Tres')}`,
        'api/uno/dos/tres/hondo.yaml':
            'kind: message\nname: Hondo\npayloadType: text\npayload: "{{level}}"\n',
    };

    for (const [path, text] of Object.entries(files)) {
        await mkdir(join(collections, path, '..'), { recursive: true });
        await writeFile(join(collections, path), text, 'utf8');
    }
}

/** The echo of a payload on the connection in front: its row says it without being opened. */
function echoSaying(payload: string) {
    return page
        .locator('[data-part="activity-row"][data-direction="in"]:visible')
        .filter({ hasText: payload });
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

test.beforeAll(async () => {
    sandbox = await makeSandbox();
    exportsDir = join(sandbox.root, 'exports');
    await mkdir(exportsDir, { recursive: true });
    echo = await startEchoServer();

    const launched = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot, {
        MANDOR_SAVE_DIR: exportsDir,
    });

    app = launched.app;
    page = launched.page;
    await expectFirstRun(page);
    await createConnection(page, 'Eco', echo.url, sandbox.repoRoot);
    await writeTree();
    await expect(page.getByRole('treeitem', { exact: true, name: 'API' })).toBeVisible();
});

test.afterAll(async () => {
    await app.close();
    await echo.close();
    await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
});

test('three nested folders go out to Mandor and come back whole in a new workspace', async () => {
    await openWorkspacesPanel(page, DEFAULT_WORKSPACE);

    const exported = await exportWorkspace(
        page,
        { file: 'personal.mandor.yaml', name: DEFAULT_WORKSPACE },
        exportsDir,
    );

    await openWorkspacesPanel(page, DEFAULT_WORKSPACE);
    await importWorkspace(page, exported);
    await expect(page.getByRole('button', { exact: true, name: SECOND })).toBeVisible();

    for (const name of ['API', ...FOLDERS]) {
        await page.getByRole('treeitem', { exact: true, name }).click();
        await page.keyboard.press('ArrowRight');
    }
});

test('the event of the deepest folder leaves with its level', async () => {
    await page.getByRole('option', { name: /Eco/u }).click();
    await page.getByRole('button', { exact: true, name: 'Connect' }).click();
    await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toBeVisible();

    await openEvent(page, 'Hondo');
    await expect(composerOf(page)).toContainText('{{level}}');
    await page.getByRole('button', { exact: true, name: 'Send' }).click();

    await expect(echoSaying('Tres')).toBeVisible();
});

test('the tab of each folder shows the doc that came back with it', async () => {
    for (const name of FOLDERS) {
        await openFolderDocs(name);
        await expect(
            page.locator('[data-part="folder-docs"]:visible').getByText(`Doc de ${name}`),
        ).toBeVisible();
    }
});

test('the export says what AsyncAPI does not keep of a folder, on the row of that folder', async () => {
    const collection = page.getByRole('treeitem', { exact: true, name: 'API' });

    await collection.hover();
    await collection.getByRole('button', { name: 'Row options' }).click();
    await page.getByRole('menuitem', { name: 'Export…' }).click();

    const tree = page.locator('[data-part="choice-tree"]');

    await tree
        .getByRole('treeitem', { exact: true, name: 'Uno' })
        .locator('[data-part="row-note"]')
        .hover();
    await expect(page.getByRole('tooltip')).toContainText(
        'AsyncAPI has no place for these variables',
    );
    await page.getByRole('button', { exact: true, name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
});
