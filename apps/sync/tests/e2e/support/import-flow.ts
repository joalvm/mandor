import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, type Locator, type Page } from '@playwright/test';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');

/**
 * The environment picker by its place in the title bar, not by name: the origin of these runs
 * stands beside it and is also called «Local».
 */
export function pickerOf(page: Page): Locator {
    return page.locator('[data-part="title-environment"]').getByRole('button');
}

/**
 * The value of one path param, by the row its name stands in: the table always ends in an empty
 * row with a value field of its own.
 */
export function pathValueOf(page: Page, name: string): Locator {
    return page
        .getByRole('tabpanel', { name: 'Path' })
        .getByRole('row', { name })
        .getByRole('textbox', { name: 'Value' });
}

/**
 * Real keystrokes over what the field held: a value set by script does not reach the form. The
 * pointer goes where writing starts: the actions of a row lie over the end of its last field.
 */
export async function typeInto(field: Locator, value: string): Promise<void> {
    await field.click({ position: { x: 1, y: 1 } });
    await field.press('ControlOrMeta+a');
    await field.pressSequentially(value);
    await expect(field).toHaveText(value);
}

/**
 * The store document with its server aimed at a port: a collection brings no environment, so its
 * requests carry the address of the first server, and a run that sends has to write it there.
 */
export async function petstoreAt(port: number): Promise<string> {
    const text = await readFile(join(FIXTURES, 'petstore-3.1.yaml'), 'utf8');

    return text.replace("default: '1'", `default: '${String(port)}'`);
}

/** The preview the dialog draws once a document is read. */
export function previewOf(page: Page): Locator {
    return page.getByRole('tree', { name: 'What would enter' });
}

type DroppedText = { content: string; name: string };

/** The drop hands the files over the way the browser does; no path is typed anywhere. */
export async function dropTexts(page: Page, documents: readonly DroppedText[]): Promise<void> {
    const dropzone = page.getByRole('region', { name: 'Drop the document here' });

    await expect(dropzone).toBeVisible();
    await dropzone.evaluate(
        (element, dropping: DroppedText[]) => {
            const dropped = dropping.map(({ content, name }) => new File([content], name));
            const drop = new DragEvent('drop', { bubbles: true });

            Object.defineProperty(drop, 'dataTransfer', { value: { files: dropped, items: [] } });
            element.dispatchEvent(drop);
        },
        [...documents],
    );
}

/** One file of the drop. */
export async function dropText(page: Page, document: DroppedText): Promise<void> {
    await dropTexts(page, [document]);
}

/** The fixtures of a set, dropped together on the open dialog, and the preview they read into. */
export async function dropFixtures(page: Page, files: readonly string[]): Promise<void> {
    const documents = await Promise.all(
        files.map(async (name) => ({
            content: await readFile(join(FIXTURES, name), 'utf8'),
            name,
        })),
    );

    await dropTexts(page, documents);
    await expect(previewOf(page)).toBeVisible();
}

/** Opens the import dialog from the heading of the collections, the way a user reaches it. */
export async function openImportDialog(page: Page, workspace: string): Promise<void> {
    // The collection comes in where the user works: the workspace the title bar shows.
    await expect(page.getByRole('button', { exact: true, name: workspace })).toBeVisible();
    await page.getByRole('button', { name: 'Import a document' }).click();
}

/**
 * Opens the import dialog and reads a fixture into its preview. The dialog is never told what
 * the file is: the app finds that out from its content.
 */
export async function previewImport(page: Page, workspace: string, file: string): Promise<void> {
    await openImportDialog(page, workspace);
    await dropFixtures(page, [file]);
}

/** Opens the import dialog and reads a text into its preview, as a file the person dropped. */
export async function previewImportText(
    page: Page,
    workspace: string,
    document: { content: string; name: string },
): Promise<void> {
    await openImportDialog(page, workspace);
    await dropText(page, document);
    await expect(previewOf(page)).toBeVisible();
}

/** Unfolds a folder of the preview with the side arrow, which leaves the row as it is. */
export async function unfold(page: Page, folder: string): Promise<void> {
    const row = previewOf(page).getByRole('treeitem', { exact: true, name: folder });

    await row.focus();
    await row.press('ArrowRight');
}

/** Writes the plan the preview shows and waits for the dialog to go. */
export async function applyImport(page: Page): Promise<void> {
    await page.getByRole('button', { exact: true, name: 'Import' }).click();
    await expect(previewOf(page)).toBeHidden();
}
