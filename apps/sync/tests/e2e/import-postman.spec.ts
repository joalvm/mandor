import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Locator, type Page } from '@playwright/test';

import { environmentText, localRepo } from './support/disk-names.js';
import { openWorkspacesPanel } from './support/exchange-flow.js';
import {
    applyImport,
    dropFixtures,
    pickerOf,
    previewImport,
    previewOf,
    typeInto,
    unfold,
} from './support/import-flow.js';
import { startLocalHttpServer, type LocalHttpServer } from './support/local-http-server.js';
import { launchSync } from './support/send-flow.js';
import { variableRow, variableValueField } from './support/variable-row.js';
import { openSection } from './support/open-section.js';

// The workspace the Postman files make takes the name of the collection among them.
const MADE = 'Demo API';

// One app and one workspace run through every test: each one starts where the last one left.
test.describe.configure({ mode: 'serial' });

let root = '';
let app: ElectronApplication;
let page: Page;
let server: LocalHttpServer;

test.beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-sync-postman-'));
    server = await startLocalHttpServer();
    await mkdir(join(root, 'origins'), { recursive: true });
    app = await launchSync(root);
    page = await app.firstWindow();

    await expect(page.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();
});

test.afterAll(async () => {
    await app.close();
    await server.close();
    await rm(root, { force: true, maxRetries: 10, recursive: true });
});

/** The environment the Postman file brings, as the made workspace keeps it. */
function madeEnvironment(): Promise<string> {
    return environmentText(localRepo(root), MADE, 'Local');
}

/** The globals of the origin, where the globals of a Postman workspace land. */
function originGlobalsText(): Promise<string> {
    return readFile(join(localRepo(root), 'globals.yaml'), 'utf8').catch(() => '');
}

async function openEnvironments(): Promise<Locator> {
    await pickerOf(page).click();
    await page.getByRole('menuitem', { name: 'Manage environments' }).click();

    const dialog = page.getByRole('dialog', { name: 'Environments' });

    await expect(dialog).toBeVisible();

    return dialog;
}

async function closeDialog(dialog: Locator): Promise<void> {
    await dialog.getByRole('button', { exact: true, name: 'Close' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
}

async function fillVariable(dialog: Locator, name: string, value: string): Promise<void> {
    await typeInto(variableValueField(dialog, name), value);
}

/** The import writes the collection and nothing else: no report doc opens in front of it. */
async function expectNoReport(): Promise<void> {
    await expect(page.getByRole('tab', { name: /^Import report/ })).toHaveCount(0);
}

test('a collection enters as folders and requests, and opens no report', async () => {
    await previewImport(page, 'Personal', 'postman-collection.json');
    await unfold(page, 'Users');

    const preview = previewOf(page);

    await expect(preview.getByRole('treeitem', { exact: true, name: 'Admin' })).toBeVisible();
    await expect(preview.getByRole('treeitem', { name: 'Get user' })).toBeVisible();
    await applyImport(page);

    await expectNoReport();
});

// A collection brings its own and nothing else: its variable does not rise to the origin.
test('the variable of the collection does not become a global', async () => {
    expect(await originGlobalsText()).not.toContain('name: base');
});

// A workspace is the one place environments and variables enter: the files of a Postman
// workspace come together through the door of the list of workspaces.
test('the files of a workspace enter together: the secret empty, the globals among the globals of the origin', async () => {
    await openWorkspacesPanel(page, 'Personal');
    await page.getByRole('button', { name: 'Import a workspace' }).click();
    await dropFixtures(page, [
        'postman-collection.json',
        'postman-environment.json',
        'postman-globals.json',
    ]);
    await applyImport(page);
    await expectNoReport();

    await expect.poll(madeEnvironment).toContain('secret: true');
    await expect.poll(async () => (await madeEnvironment()).includes('s3cret')).toBe(false);
    await expect.poll(originGlobalsText).toContain('region');
    // The variable of the collection is the collection's: the origin holds only the globals.
    expect(await originGlobalsText()).not.toContain('name: base');
});

test('the imported request sends with the environment filled in, and its scripts are read-only text', async () => {
    const dialog = await openEnvironments();

    await dialog.getByRole('option', { exact: true, name: 'Local' }).click();

    await fillVariable(dialog, 'base', server.origin);
    await expect.poll(madeEnvironment).toContain(server.origin);
    // The container has no keyring to keep a secret in, so the token is made plain for the send.
    await variableRow(dialog, 'token').getByRole('button', { name: 'Secret variable' }).click();
    await expect
        .poll(async () =>
            /name: token\s+value: ""\s+enabled: true\s+secret: false/u.test(
                await madeEnvironment(),
            ),
        )
        .toBe(true);
    await fillVariable(dialog, 'token', 't0k');
    await expect.poll(madeEnvironment).toContain('t0k');
    await closeDialog(dialog);

    await pickerOf(page).click();
    await page.getByRole('menuitem', { name: /^local$/iu }).click();

    const item = page.getByRole('treeitem', { name: 'Get user' });

    if ((await item.count()) === 0) {
        await page.getByRole('treeitem', { exact: true, name: 'Users' }).click();
    }

    await item.click();
    await openSection(page, 'Scripts');
    // The editor of the moment stands first; the two imported scripts follow, each read-only
    // beside its own heading, kept as text nothing here runs.
    await expect(page.getByRole('textbox', { name: 'Script' })).toHaveCount(3);
    await page.getByRole('button', { exact: true, name: 'Send' }).click();

    await expect.poll(() => server.users).toEqual(['/users/7 Bearer t0k']);
});

test('importing the collection again does not duplicate what is there', async () => {
    await previewImport(page, 'Demo API', 'postman-collection.json');
    await applyImport(page);

    await expect(page.getByRole('treeitem', { name: 'Get user' })).toHaveCount(1);
    await expect(page.getByRole('treeitem', { exact: true, name: 'Users' })).toHaveCount(1);
});
