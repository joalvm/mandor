import { readFileSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox } from './support/launch-app.js';

const FIXTURE = readFileSync(
    fileURLToPath(
        new URL(
            '../../../../packages/interop-formats/tests/asyncapi/fixtures/ida-vuelta-3.yaml',
            import.meta.url,
        ),
    ),
    'utf8',
);

/** The workspaces panel, reached the way a user reaches it: from the menu of the title row. */
async function openWorkspacesPanel(page: Page, activeWorkspace: string): Promise<void> {
    await page.getByRole('button', { name: activeWorkspace }).click();
    await page.getByRole('menuitem', { name: 'Manage workspaces' }).click();
}

async function createWorkspace(page: Page, name: string): Promise<void> {
    await page.getByRole('button', { name: 'New workspace' }).click();

    const field = page.getByRole('textbox', { name: 'Workspace name' });

    await field.click();
    await field.pressSequentially(name);
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
}

/** The import door of the collections, fed by a drop: the way a document comes in without a path. */
async function importDocument(page: Page, text: string): Promise<void> {
    await page.getByRole('button', { name: 'Import a document' }).click();

    const dropzone = page.getByRole('region', { name: 'Drop the document here' });

    await expect(dropzone).toBeVisible();

    await dropzone.evaluate((element, content) => {
        const file = new File([content], 'documento.yaml', { type: 'text/yaml' });
        const drop = new DragEvent('drop', { bubbles: true });

        Object.defineProperty(drop, 'dataTransfer', { value: { files: [file], items: [] } });
        element.dispatchEvent(drop);
    }, text);

    await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(page.getByRole('tree', { name: 'What would enter' })).toBeHidden();
}

async function expectEvent(page: Page, name: string): Promise<void> {
    await expect(page.getByRole('treeitem', { name: new RegExp(name) })).toBeVisible();
}

/**
 * The export door, in the menu of the first collection: the tree offers everything marked, and
 * what is left marked is written where the dialog of the system answers — here, the folder the
 * run's environment names, which is what makes the written file readable by the test.
 */
async function exportCollection(page: Page, name: string, exportsDir: string): Promise<string> {
    const collection = page.getByRole('treeitem', { level: 1 }).first();

    await collection.getByRole('button', { name: 'Row options' }).click();
    await page.getByRole('menuitem', { name: 'Export…' }).click();

    const tree = page.locator('[data-part="choice-tree"]');

    await expect(tree.getByRole('treeitem').first()).toHaveText(name);
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    return readFile(join(exportsDir, 'almacen.yaml'), 'utf8');
}

/** A workspace of its own, then the document dropped in: the start of every trip. */
async function bringDocumentIn(page: Page, workspace: string, text: string): Promise<void> {
    await openWorkspacesPanel(page, 'Personal');
    await createWorkspace(page, workspace);
    await importDocument(page, text);

    await expectEvent(page, 'recibos/salientes');
    await expectEvent(page, 'avisos/salientes');
}

/** The way back: the file goes into a workspace that holds nothing, and its collection answers. */
async function bringDocumentBack(page: Page, from: string, text: string): Promise<void> {
    await openWorkspacesPanel(page, from);
    await createWorkspace(page, 'Otro');
    await importDocument(page, text);

    await expectEvent(page, 'recibos/salientes');
    await expectEvent(page, 'avisos/salientes');
}

/** What the written file has to say: the format, the addresses, and the arrow that comes back. */
function expectDocumentCarries(text: string): void {
    expect(text).toContain('asyncapi: 3.0.0');
    expect(text).toContain('address: recibos/salientes');
    expect(text).toContain('address: avisos/salientes');
    expect(text).toContain('action: receive');
    expect(text).not.toContain('action: send');
}

test('a document the workspace holds comes back with nothing lost', async () => {
    const sandbox = await makeSandbox();
    const exportsDir = join(sandbox.root, 'exports');

    await mkdir(exportsDir, { recursive: true });

    let running: ElectronApplication | undefined;

    try {
        const { app, page } = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot, {
            MANDOR_SAVE_DIR: exportsDir,
        });

        running = app;

        await expectFirstRun(page);

        // A workspace of its own, named after the document, so the trip starts from a clean
        // collection and the document keeps the name it arrived with.
        await bringDocumentIn(page, 'Almacen', FIXTURE);

        const exported = await exportCollection(page, 'Almacen', exportsDir);

        expectDocumentCarries(exported);

        // And the way back: the file the export wrote comes in again, into a workspace that
        // holds nothing, and the collection it builds answers for every operation it carried.
        await bringDocumentBack(page, 'Almacen', exported);
    } finally {
        if (running !== undefined) {
            await running.close();
        }

        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
