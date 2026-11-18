// The doors of the exchange and the environment, driven the way a user drives them.

import { join } from 'node:path';

import { readdir, readFile } from 'node:fs/promises';
import { expect, type Page } from '@playwright/test';

import { previewImport } from './import-flow.js';

/** The workspaces panel, reached the way a user reaches it: from the menu of the title row. */
export async function openWorkspacesPanel(page: Page, activeWorkspace: string): Promise<void> {
    await page.getByRole('button', { name: activeWorkspace }).click();
    await page.getByRole('menuitem', { name: 'Manage workspaces' }).click();
}

export async function createWorkspace(page: Page, name: string): Promise<void> {
    await page.getByRole('button', { name: 'New workspace' }).click();

    const field = page.getByRole('textbox', { name: 'Workspace name' });

    await field.click();
    await field.pressSequentially(name);
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
}

/** A workspace of its own, made from the one that is open, with a document read into its preview. */
export async function previewInNewWorkspace(
    page: Page,
    [from, name]: [string, string],
    [file]: [string],
): Promise<void> {
    await openWorkspacesPanel(page, from);
    await createWorkspace(page, name);
    await previewImport(page, name, file);
}

/** The import writes the collection and nothing else: no report doc opens in front of it. */
export async function expectNoReport(page: Page): Promise<void> {
    await expect(page.getByRole('tab', { name: /^Import report/ })).toHaveCount(0);
}

/** A text dropped on the open import dialog and the import it offers taken: no path is typed. */
async function dropAndImport(page: Page, document: { name: string; text: string }): Promise<void> {
    const dropzone = page.getByRole('region', { name: 'Drop the document here' });

    await expect(dropzone).toBeVisible();

    await dropzone.evaluate((element, dropping) => {
        const file = new File([dropping.text], dropping.name, { type: 'text/yaml' });
        const drop = new DragEvent('drop', { bubbles: true });

        Object.defineProperty(drop, 'dataTransfer', { value: { files: [file], items: [] } });
        element.dispatchEvent(drop);
    }, document);

    await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(page.getByRole('tree', { name: 'What would enter' })).toBeHidden();
}

/** The import door of the collections, fed by a drop: the way a document comes in without a path. */
export async function importDocument(page: Page, text: string): Promise<void> {
    await page.getByRole('button', { name: 'Import a document' }).click();
    await dropAndImport(page, { name: 'documento.yaml', text });
}

/** The import door of the list of workspaces: the file becomes a workspace of its own. */
export async function importWorkspace(page: Page, text: string): Promise<void> {
    await page.getByRole('button', { name: 'Import a workspace' }).click();
    await dropAndImport(page, { name: 'workspace.mandor.yaml', text });
}

/**
 * The export door of the workspaces page: the dialog names the workspace it covers, and what is
 * left marked is written where the dialog of the system answers — the folder the run names.
 */
export async function exportWorkspace(
    page: Page,
    { file, name }: { file: string; name: string },
    exportsDir: string,
): Promise<string> {
    await page.getByRole('button', { name: 'Export a workspace' }).click();

    const tree = page.locator('[data-part="choice-tree"]');

    await expect(tree.getByRole('treeitem').first()).toHaveText(name);
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    return readFile(join(exportsDir, file), 'utf8');
}

/**
 * The export door of the first collection, in its menu: the tree, under the name of the collection,
 * offers everything marked, and what is left marked is written where the dialog of the system answers — here, the folder the
 * run's environment names, which is what makes the written file readable by the test.
 */
export async function exportCollection(
    page: Page,
    name: string,
    exportsDir: string,
): Promise<string> {
    const collection = page.getByRole('treeitem', { level: 1 }).first();

    await collection.getByRole('button', { name: 'Row options' }).click();
    await page.getByRole('menuitem', { name: 'Export…' }).click();

    const tree = page.locator('[data-part="choice-tree"]');

    await expect(tree.getByRole('treeitem').first()).toHaveText(name);
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    return readFile(join(exportsDir, `${name.toLowerCase().replaceAll(' ', '-')}.yaml`), 'utf8');
}

/** The environment is written a moment after the keys: a send or an export reads it from disk. */
export async function expectEnvironmentOnDisk(folder: string, value: string): Promise<void> {
    await expect
        .poll(async () => {
            const files = await readdir(folder).catch((): string[] => []);
            const texts = await Promise.all(
                files.map((file) => readFile(join(folder, file), 'utf8')),
            );

            return texts.some((text) => text.includes(value));
        })
        .toBe(true);
}

export async function openRequest(page: Page, folder: string, name: RegExp): Promise<void> {
    // A collection that came back from disk may sit collapsed: the folder opens, then the
    // request. The name is whole-word: the collection the import wrote says the folder's name
    // too, and the row that opens is the folder of one level down.
    const parent = page.getByRole('treeitem', { name: new RegExp(`^${folder}$`) });

    await parent.click();
    await parent.press('ArrowRight');

    const item = page.getByRole('treeitem', { name });

    await item.click();
    await expect(page.getByRole('tab', { name })).toBeVisible();
}

/** The titles the workspace names, not the document: the one line the two exports may differ. */
export function withoutTitle(text: string): string {
    return text
        .split('\n')
        .filter((line) => !line.trim().startsWith('title:'))
        .join('\n');
}

/**
 * The tag a request carries names the collection it files under, and an import of what left
 * nests it one more: the two exports differ there the way they differ in the title.
 */
export function withoutTags(text: string): string {
    const lines: string[] = [];
    let inTags = false;

    for (const line of text.split('\n')) {
        if (line.trim() === 'tags:') {
            inTags = true;

            continue;
        }

        if (inTags && line.trim().startsWith('- ')) {
            continue;
        }

        inTags = false;
        lines.push(line);
    }

    return lines.join('\n');
}
