import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { environmentsDir, itemText, localRepo, PERSONAL } from './support/disk-names.js';
import { expectEnvironmentOnDisk } from './support/exchange-flow.js';
import {
    applyImport,
    pathValueOf,
    petstoreAt,
    previewImport,
    previewImportText,
    previewOf,
    typeInto,
    unfold,
} from './support/import-flow.js';
import { startLocalHttpServer, type LocalHttpServer } from './support/local-http-server.js';
import { createEnvironment, launchSync, saveRequest } from './support/send-flow.js';
import { writeNewRow } from './support/variable-row.js';
import { openSection } from './support/open-section.js';

// One app and one workspace run through every test: each one starts where the last one left.
test.describe.configure({ mode: 'serial' });

let root = '';
let app: ElectronApplication;
let page: Page;
let server: LocalHttpServer;

test.beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-sync-import-'));
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

/** The import writes the collection and nothing else: no report doc opens in front of it. */
async function expectNoReport(): Promise<void> {
    await expect(page.getByRole('tab', { name: /^Import report/ })).toHaveCount(0);
}

/** The file of a request is where a hand edit has to arrive before a reimport can see it. */
async function requestFile(name: string): Promise<string> {
    // The document lands as one collection named as its title, and the request files inside it.
    return itemText(localRepo(root), PERSONAL, ['Tienda de mascotas', 'pets', name]);
}

/** The pet the server knows, asked for by the imported request with its path filled in. */
async function sendPetSeven(): Promise<void> {
    await page.getByRole('treeitem', { name: 'Get a pet' }).click();
    await openSection(page, 'Path');
    await typeInto(pathValueOf(page, 'petId'), '7');
    await page.getByRole('button', { name: 'Send' }).click();
}

/** The store document aimed at the server of the run, read into the preview of the open dialog. */
async function previewPetstore(): Promise<void> {
    await previewImportText(page, 'Personal', {
        content: await petstoreAt(server.port),
        name: 'petstore-3.1.yaml',
    });
}

test('an OpenAPI 3.1 document enters as a collection and its request answers a send', async () => {
    await previewPetstore();

    const preview = previewOf(page);

    await unfold(page, 'pets');
    await expect(preview.getByRole('treeitem', { name: 'Add a pet' })).toBeVisible();
    await expect(preview.getByRole('treeitem', { name: 'Get a pet' })).toBeVisible();
    // A collection owns itself: the server of the document is no environment of the workspace.
    await expect(preview.getByRole('treeitem', { exact: true, name: 'local' })).toHaveCount(0);
    await applyImport(page);

    await expectNoReport();

    // The bearer scheme leans on a variable the person owns: it comes with an environment.
    await createEnvironment(page, server.origin, { token: 't0k' });
    await expectEnvironmentOnDisk(await environmentsDir(localRepo(root), PERSONAL), 't0k');

    await sendPetSeven();

    await expect.poll(() => server.pets).toEqual(['/pets/7 Bearer t0k']);
    await saveRequest(page);
    await expect.poll(() => requestFile('Get a pet')).toContain('value: "7"');
});

test('a reimport keeps what the person wrote and leaves their edits unmarked', async () => {
    await previewPetstore();
    await unfold(page, 'pets');

    const preview = previewOf(page);

    // The path value was filled by hand: that row is the person's now, and this one is not.
    await expect(preview.getByRole('checkbox', { name: 'Add a pet' })).toBeChecked();
    await expect(preview.getByRole('checkbox', { name: 'Get a pet' })).not.toBeChecked();
    await applyImport(page);

    await expect(page.getByRole('treeitem', { name: 'Add a pet' })).toHaveCount(1);
    await expect(page.getByRole('treeitem', { name: 'Get a pet' })).toHaveCount(1);
});

test('a request edited by hand comes out of the next import unmarked', async () => {
    await page.getByRole('treeitem', { name: 'Add a pet' }).click();
    await openSection(page, 'Headers');
    await writeNewRow(page.getByRole('tabpanel', { name: 'Headers' }).first(), 'X-Tag', 'quiet');
    await saveRequest(page);
    await expect.poll(() => requestFile('Add a pet')).toContain('X-Tag');

    await previewImport(page, 'Personal', 'petstore-3.1.yaml');
    await unfold(page, 'pets');
    await expect(previewOf(page).getByRole('checkbox', { name: 'Add a pet' })).not.toBeChecked();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(previewOf(page)).toBeHidden();
});

test('a Swagger 2.0 document enters another workspace as a collection of its own', async () => {
    await page.getByRole('button', { name: 'Personal', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Manage workspaces' }).click();
    await page.getByRole('button', { name: 'New workspace' }).click();

    const field = page.getByRole('textbox', { name: 'Workspace name' });

    await field.click();
    await field.pressSequentially('Segunda');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    await previewImport(page, 'Segunda', 'petstore-2.0.json');
    await applyImport(page);
    await expect(page.getByRole('treeitem', { name: 'Get a pet' })).toBeVisible();
});
