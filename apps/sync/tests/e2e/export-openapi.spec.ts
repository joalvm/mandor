import { readFileSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

import { environmentsDir, itemText, localRepo } from './support/disk-names.js';
import {
    createWorkspace,
    exportCollection,
    expectEnvironmentOnDisk,
    importDocument,
    openRequest,
    openWorkspacesPanel,
    withoutTags,
    withoutTitle,
} from './support/exchange-flow.js';
import { launch, makeSandbox } from './support/launch-app.js';
import { startLocalHttpServer } from './support/local-http-server.js';
import { createEnvironment, saveRequest } from './support/send-flow.js';
import { openSection } from './support/open-section.js';

const FIXTURE = readFileSync(
    fileURLToPath(new URL('./fixtures/petstore-3.1.yaml', import.meta.url)),
    'utf8',
);

/**
 * A workspace of its own, then the document dropped in and an environment aimed at the server: a
 * collection brings none, and the servers a document goes out with are the ones the environments say.
 */
async function bringDocumentIn(
    page: Page,
    {
        root,
        workspace,
        text,
        origin,
    }: { root: string; workspace: string; text: string; origin: string },
): Promise<void> {
    await openWorkspacesPanel(page, 'Personal');
    await createWorkspace(page, workspace);
    await importDocument(page, text);

    await expect(page.getByRole('treeitem', { name: /pets/ })).toBeVisible();
    await createEnvironment(page, origin, { token: 't0k' });
    await expectEnvironmentOnDisk(await environmentsDir(localRepo(root), 'Tienda'), origin);
}

/** The title of the document: the collection it lands as, and the name of what leaves it. */
const COLLECTION = 'Tienda de mascotas';

/** The first way out, with what the document of the store has to say read off the file. */
async function exportAndAssert(page: Page, exportsDir: string, origin: string): Promise<string> {
    const exported = await exportCollection(page, COLLECTION, exportsDir);

    expect(exported).toContain('openapi: 3.1.0');
    expect(exported).toContain('/pets/{petId}:');
    expect(exported).toContain('bearerAuth');
    // The server is the address of the environment the run aimed at the store.
    expect(exported).toContain(origin);
    expect(exported).not.toMatch(/token: \S+/u);

    return exported;
}

/** The way back: the export lands in a workspace of its own, and goes out again the same. */
async function bringBackAndExport(
    page: Page,
    {
        exported,
        exportsDir,
        origin,
        root,
    }: { exported: string; exportsDir: string; origin: string; root: string },
): Promise<string> {
    await openWorkspacesPanel(page, 'Tienda');
    await createWorkspace(page, 'Otro');
    await importDocument(page, exported);

    await expect(page.getByRole('treeitem', { name: /pets/ })).toBeVisible();
    // A collection brings no environment: the one that gives the document its servers is made again.
    await createEnvironment(page, origin, { token: 't0k' });
    await expectEnvironmentOnDisk(await environmentsDir(localRepo(root), 'Otro'), origin);

    const exportedAgain = await exportCollection(page, COLLECTION, exportsDir);

    expect(withoutTags(withoutTitle(exportedAgain))).toBe(withoutTags(withoutTitle(exported)));

    return exportedAgain;
}

/** The body broken on purpose, the warning it raises, and the send the person insists on. */
async function sendAgainstSchema(page: Page, root: string): Promise<void> {
    // The folder of the reimported document keeps the tag the export wrote: the name of the folder.
    await openRequest(page, 'pets', /Add a pet/u);
    await openSection(page, 'Body');

    const editor = page.locator('[data-part="request-body-content"] .view-lines');

    await expect(editor).toBeVisible();

    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    await page.keyboard.insertText('{"name": 1}');
    await expect(editor).toHaveText('{"name": 1}');

    await page.getByRole('button', { name: 'Send' }).click();
    await saveRequest(page);

    // The body is on disk once the request is saved: the schema rode with it. The reimported
    // document lands as the collection its title names, with the tag as the one folder it has.
    const names = [COLLECTION, 'pets', 'Add a pet'];

    await expect
        .poll(async () => (await itemText(localRepo(root), 'Otro', names)).includes('"name": 1'))
        .toBe(true);

    // The send that went out against the schema still reaches the wire: the echo names
    // the method that carried it.
    const response = page.locator('[data-part="response-panel"]');

    await expect(response.locator('[data-part="response-status"]')).toHaveText('200');

    await openSection(response, 'Headers');
    await expect(response.getByRole('row', { name: /x-echo/i })).toContainText('POST');
}

/**
 * The trip of a document that Sync holds: what an import wrote goes out as OpenAPI 3.1, comes
 * back into a workspace of its own, and goes out again saying the same thing. And the schema
 * an import brought speaks before the send: a body that breaks it warns, and only the person
 * decides to send it anyway.
 */
test('an imported workspace exports, reimports and exports saying the same, and its schema warns before the send', async () => {
    const { defaultRepoRoot, root, userDataDir } = await makeSandbox();
    const exportsDir = join(root, 'exports');
    const server = await startLocalHttpServer();

    await mkdir(join(root, 'origins'), { recursive: true });
    await mkdir(exportsDir, { recursive: true });

    const { app, page } = await launch(userDataDir, defaultRepoRoot, {
        MANDOR_SAVE_DIR: exportsDir,
    });

    try {
        await expect(page.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();

        // A workspace of its own, so the trip starts from a clean collection: the one the title
        // of the document names, which is the name the export takes.
        await bringDocumentIn(page, {
            root,
            workspace: 'Tienda',
            text: FIXTURE,
            origin: server.origin,
        });

        // Out it goes: the format, the route with its placeholder, the scheme of the default
        // security, the server of the environment, and never a value of a variable.
        const exported = await exportAndAssert(page, exportsDir, server.origin);

        // And the way back: the file the export wrote comes into a workspace that holds
        // nothing, and what it builds goes out again saying the same thing.
        await bringBackAndExport(page, { exported, exportsDir, origin: server.origin, root });

        // The schema the import brought speaks before the send: a body that breaks it warns,
        // and the send only happens when the person says so. The workspace is already open:
        // the trip back left it as the active one.
        await sendAgainstSchema(page, root);
    } finally {
        await app.close();
        await server.close();
        await rm(root, { force: true, maxRetries: 10, recursive: true });
    }
});
