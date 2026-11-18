import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, type Page } from '@playwright/test';

/** The workspace panel, reached the way a user reaches it: from the menu of the title row. */
export async function openWorkspacesPanel(page: Page, activeWorkspace: string): Promise<void> {
    await page.getByRole('button', { name: activeWorkspace }).click();
    await page.getByRole('menuitem', { name: 'Manage workspaces' }).click();
}

/** One workspace of its own, born from the dialog the panel opens. */
export async function createWorkspace(page: Page, name: string): Promise<void> {
    await page.getByRole('button', { name: 'New workspace' }).click();

    const field = page.getByRole('textbox', { name: 'Workspace name' });

    await expect(field).toBeVisible();
    await field.click();
    await field.pressSequentially(name);
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
}

/** A text dropped on the open import dialog and the import it offers taken: no path is typed. */
async function dropAndImport(page: Page, fileName: string, text: string): Promise<void> {
    const dropzone = page.getByRole('region', { name: 'Drop the document here' });

    await expect(dropzone).toBeVisible();

    await dropzone.evaluate(
        (element, { content, name }) => {
            const file = new File([content], name, { type: 'text/yaml' });
            const drop = new DragEvent('drop', { bubbles: true });

            Object.defineProperty(drop, 'dataTransfer', { value: { files: [file], items: [] } });
            element.dispatchEvent(drop);
        },
        { content: text, name: fileName },
    );

    await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(page.getByRole('tree', { name: 'What would enter' })).toBeHidden();
}

/** The import door of the collections, fed by a drop: the way a document comes in without a path. */
export async function importDocument(page: Page, fileName: string, text: string): Promise<void> {
    await page.getByRole('button', { name: 'Import a document' }).click();
    await dropAndImport(page, fileName, text);
}

/** The import door of the list of workspaces: the file becomes a workspace of its own. */
export async function importWorkspace(page: Page, text: string): Promise<void> {
    await page.getByRole('button', { name: 'Import a workspace' }).click();
    await dropAndImport(page, 'workspace.mandor.yaml', text);
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
