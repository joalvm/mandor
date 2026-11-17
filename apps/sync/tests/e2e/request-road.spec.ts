import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import { environmentsDir } from './support/disk-names.js';
import {
    createWorkspace,
    expectNoReport,
    exportCollection,
    expectEnvironmentOnDisk,
    importDocument,
    openRequest,
    openWorkspacesPanel,
    previewInNewWorkspace,
    withoutTags,
    withoutTitle,
} from './support/exchange-flow.js';
import {
    applyImport,
    pathValueOf,
    petstoreAt,
    previewOf,
    typeInto,
} from './support/import-flow.js';
import { launch, makeSandbox, type Sandbox } from './support/launch-app.js';
import { startLocalHttpServer, type LocalHttpServer } from './support/local-http-server.js';
import { aim, createEnvironment, createRequest, responseOf } from './support/send-flow.js';
import { openSection } from './support/open-section.js';

/** The folder of the sandbox the save dialog of the app answers with. */
const EXPORTS = 'exports';

/**
 * The whole road in one run. Every piece keeps its own spec: this one walks them in sequence —
 * a request goes out and its history survives the window, an OpenAPI document comes in, answers
 * a send and goes out again saying the same, a Postman collection and a HAR recording come in
 * without a report to open — to prove they fit. What the walk breaks gets fixed here: this is
 * where the seams between pieces show up.
 */
test('a send, its history and three imports fit together end to end', async () => {
    // Seven paths in one run: the budget of the config counts a single one, not this walk.
    test.setTimeout(300_000);

    const started = Date.now();
    const sandbox = await makeSandbox();
    const exportsDir = join(sandbox.root, EXPORTS);
    const server = await startLocalHttpServer();
    let running: ElectronApplication | undefined;

    try {
        await mkdir(exportsDir, { recursive: true });

        const first = await launchRoad(sandbox, exportsDir);

        running = first.app;
        await sendFromPersonal(first.page, server);
        // Async draws its connections' activity under `activity-*` parts; Sync has no such list.
        await expect(first.page.locator('[data-part^="activity"]')).toHaveCount(0);
        await running.close();

        const second = await launchRoad(sandbox, exportsDir);

        running = second.app;
        await walkTheRest(second.page, server, sandbox);

        console.log(`request road: ${String(Date.now() - started)} ms`);
    } finally {
        // Whatever state the road died in, nothing of the run stays alive behind it.
        await running?.close();
        await server.close();
        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});

/** The app over the sandbox of the run, with the folder its save dialog answers with. */
async function launchRoad(sandbox: Sandbox, exportsDir: string) {
    return launch(sandbox.userDataDir, sandbox.defaultRepoRoot, { MANDOR_SAVE_DIR: exportsDir });
}

/** What the window that came back does: find the history, then take the documents in and out. */
async function walkTheRest(page: Page, server: LocalHttpServer, sandbox: Sandbox): Promise<void> {
    await reopenAndFindHistory(page);
    await importOpenApi(page, server, sandbox.repoRoot);
    await roundTripOpenApi(page, join(sandbox.root, EXPORTS), server.origin, sandbox.repoRoot);
    await importPostman(page);
    await importHar(page);
}

/** The workspace the app ships with, an environment aimed at the server, and one request to its echo. */
async function sendFromPersonal(page: Page, server: LocalHttpServer): Promise<void> {
    await expect(page.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();
    await createEnvironment(page, server.origin);
    await createRequest(page);

    await openSection(page, 'Body');
    await page.getByRole('combobox', { name: 'Body type' }).click();
    await page.getByRole('option', { name: 'JSON' }).click();
    await editorLines(page, 'code-editor').click();
    await page.keyboard.insertText('{"road":"request"}');
    await aim(page, 'POST', '/echo');
    await page.getByRole('button', { name: 'Send' }).click();

    const response = responseOf(page);

    await expect(response.locator('[data-part="response-status"]')).toHaveText('200');
    await openSection(response, 'Headers');
    await expect(response.getByRole('row', { name: /content-type/i })).toBeVisible();
    await response.locator('[data-part="response-time"]').hover();
    // "10 ms" is a time too: only a lone zero means nothing was measured.
    await expect(page.locator('[data-part="timing-row"]').last()).not.toHaveText(/\D0 ms$/u);
}

/** The window closed and opened again: the send is in the history, and opens with its answer. */
async function reopenAndFindHistory(page: Page): Promise<void> {
    await expect(page.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();
    await page.keyboard.press('ControlOrMeta+Shift+P');
    await page.getByRole('textbox', { name: 'Search commands' }).fill('history');
    await page.getByRole('option', { name: /Open history/ }).click();

    const list = page.locator('[data-part="history-list"]');

    await expect(list).toContainText('POST');
    await expect(list).toContainText('/echo');
    await expect(list.locator('[data-part="history-outcome"]')).toHaveText('200');

    await list.getByText('/echo').click();
    await expect(
        page.locator('[data-part="history-entry"] [data-part="response-status"]'),
    ).toHaveText('200');
}

/** The document of the store comes in aimed at the server, an environment is made, and one request sends. */
async function importOpenApi(page: Page, server: LocalHttpServer, repoRoot: string): Promise<void> {
    await openWorkspacesPanel(page, 'Personal');
    await createWorkspace(page, 'Tienda');
    // A collection brings no environment: its requests carry the address of the first server,
    // so the document comes aimed at the run, and the environment is made for the export.
    await importDocument(page, await petstoreAt(server.port));
    await createEnvironment(page, server.origin, { token: 't0k' });
    await expectEnvironmentOnDisk(await environmentsDir(repoRoot, 'Tienda'), server.origin);

    await openRequest(page, 'pets', /Get a pet/u);
    await openSection(page, 'Path');
    await typeInto(pathValueOf(page, 'petId'), '7');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(responseOf(page).locator('[data-part="response-status"]')).toHaveText('200');
    await expect.poll(() => server.pets[0]?.startsWith('/pets/7')).toBe(true);
}

/** Out as OpenAPI 3.1, back into a workspace that holds nothing, and out again the same. */
async function roundTripOpenApi(
    page: Page,
    exportsDir: string,
    origin: string,
    repoRoot: string,
): Promise<void> {
    const exported = await exportCollection(page, 'Tienda de mascotas', exportsDir);

    expect(await readFile(join(exportsDir, 'tienda-de-mascotas.yaml'), 'utf8')).toBe(exported);
    expect(exported).toContain('openapi: 3.1.0');
    expect(exported).toContain('/pets/{petId}');

    await openWorkspacesPanel(page, 'Tienda');
    await createWorkspace(page, 'Otro');
    await importDocument(page, exported);
    // A collection brings no environment: the one that gives the document its servers is made again.
    await createEnvironment(page, origin, { token: 't0k' });
    await expectEnvironmentOnDisk(await environmentsDir(repoRoot, 'Otro'), origin);

    const again = await exportCollection(page, 'Tienda de mascotas', exportsDir);

    expect(withoutTags(withoutTitle(again))).toBe(withoutTags(withoutTitle(exported)));
}

/** The collection comes in with its scripts inert, and no report opens in front of it. */
async function importPostman(page: Page): Promise<void> {
    await previewInNewWorkspace(page, ['Otro', 'Migrado'], ['postman-collection.json']);
    await applyImport(page);

    await expectNoReport(page);
}

/** The recording comes in as a folder per host, and the credential it carried stays out. */
async function importHar(page: Page): Promise<void> {
    await previewInNewWorkspace(page, ['Migrado', 'Recorded'], ['recorded.har']);

    for (const host of ['api.example.test', 'cdn.example.test']) {
        await expect(
            previewOf(page).getByRole('treeitem', { exact: true, name: host }),
        ).toBeVisible();
    }

    await applyImport(page);

    await expectNoReport(page);
}
