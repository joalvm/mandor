import { mkdir, rm, writeFile } from 'node:fs/promises';
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
let app: ElectronApplication;
let page: Page;
let echo: Awaited<ReturnType<typeof startEchoServer>>;

/** A plain variable as the file of a collection or a folder writes it. */
function variable(name: string, value: string): string {
    return `  - name: ${name}\n    value: ${value}\n    enabled: true\n    secret: false\n`;
}

/**
 * The tree the test reads from: a collection with a folder and a subfolder, `level` declared in
 * the three of them, and an event in the subfolder whose payload is that variable alone.
 */
async function writeTree(): Promise<void> {
    const workspace = await defaultWorkspaceDir(sandbox.repoRoot);
    const collections = join(sandbox.repoRoot, workspace, 'collections');
    const files: Record<string, string> = {
        'collections.yaml': 'order:\n  - api\n',
        'api/collection.yaml': `name: API\norder:\n  - carpeta\nvariables:\n${variable('level', 'coleccion')}`,
        'api/carpeta/folder.yaml': `name: Carpeta\norder:\n  - sub\nvariables:\n${variable('level', 'carpeta')}`,
        'api/carpeta/sub/folder.yaml': `name: Sub\norder:\n  - hondo\nvariables:\n${variable('level', 'subcarpeta')}`,
        'api/carpeta/sub/hondo.yaml':
            'kind: message\nname: Hondo\npayloadType: text\npayload: "{{level}}"\n',
    };

    for (const [path, text] of Object.entries(files)) {
        await mkdir(join(collections, path, '..'), { recursive: true });
        await writeFile(join(collections, path), text, 'utf8');
    }
}

/**
 * Opens a connection to the echo through the environment, which alone knows its host: a
 * connection lives in no folder, so only the environment can resolve its url.
 */
async function connect(name: string): Promise<void> {
    await createConnection(page, name, 'ws://{{host}}/', sandbox.repoRoot);
    await chooseEnvironment(page);
    await page.getByRole('button', { exact: true, name: 'Connect' }).click();
    await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toBeVisible();
}

/** The echo of a payload on the connection in front: its row says it without being opened. */
function echoSaying(payload: string) {
    return page
        .locator('[data-part="activity-row"][data-direction="in"]:visible')
        .filter({ hasText: payload });
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
    await expect(page.getByRole('treeitem', { name: 'API' })).toBeVisible();
});

test.afterAll(async () => {
    await app.close();
    await echo.close();
    await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
});

test('the url of the connection resolves with the environment, which lives in no folder', async () => {
    await connect('Eco');
});

test('an item of the subfolder loaded in the composer leaves with the value of the subfolder', async () => {
    for (const folder of ['API', 'Carpeta', 'Sub']) {
        await page.getByRole('treeitem', { name: folder }).click();
        await page.keyboard.press('ArrowRight');
    }

    await openEvent(page, 'Hondo');
    await expect(composerOf(page)).toContainText('{{level}}');
    await page.getByRole('button', { exact: true, name: 'Send' }).click();

    await expect(echoSaying('subcarpeta')).toBeVisible();
});
