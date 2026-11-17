import { join } from 'node:path';

import { expect, type ElectronApplication, type Locator, type Page } from '@playwright/test';
import { launch } from './launch-app.js';
import { writeRowAt } from './variable-row.js';

/** The app over a run directory the test owns: its user data and its origins live inside. */
export async function launchSync(root: string): Promise<ElectronApplication> {
    const { app } = await launch(join(root, 'user-data'), join(root, 'origins'));

    return app;
}

/**
 * The environment of the workspace, with the one variable every request of a run is written
 * with, and the ones a test asks for besides.
 */
export async function createEnvironment(
    page: Page,
    origin: string,
    more: Record<string, string> = {},
): Promise<void> {
    // The picker by its place in the title bar: the origin beside it is also called «Local».
    const picker = page.locator('[data-part="title-environment"]').getByRole('button');

    await picker.click();
    await page.getByRole('menuitem', { name: 'Create environment' }).click();
    await picker.click();
    await page.getByRole('menuitem', { name: 'Manage environments' }).click();

    const dialog = page.getByRole('dialog', { name: 'Environments' });

    const variables = Object.entries({ baseUrl: origin, ...more });

    for (const [at, [name, value]] of variables.entries()) {
        await writeVariableRow(dialog, at, name, value);
    }

    await dialog.getByRole('button', { exact: true, name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);
}

/**
 * Names the request just made from its row. It is born under its word with the URL in focus,
 * since the work goes on in its tab; the name changes from the row menu.
 */
export async function nameNewRequest(page: Page, name: string): Promise<void> {
    await expect(page.getByRole('textbox', { name: 'URL' })).toBeFocused();

    const born = page.getByRole('treeitem', { exact: true, name: 'New request' });

    await born.getByRole('button', { name: 'Row options' }).click();
    await page.getByRole('menuitem', { exact: true, name: 'Rename' }).click();
    await page.getByRole('textbox', { name: 'New name' }).fill(name);
    await page.getByRole('textbox', { name: 'New name' }).press('Enter');
}

/** The row of one request, made the way the user makes it: named in the tree, not yet opened. */
export async function createRequestRow(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'New collection' }).click();
    await page.getByRole('textbox', { name: 'New name' }).fill('pedidos');
    await page.getByRole('textbox', { name: 'New name' }).press('Enter');

    const folder = page.getByRole('treeitem', { name: 'pedidos' });

    await folder.getByRole('button', { name: 'Row options' }).click();
    await page.getByRole('menuitem', { name: 'New request' }).click();
    await nameNewRequest(page, 'crear pedido');
}

/** One request, made the way the user makes it: named in the tree, written in its tab. */
export async function createRequest(page: Page): Promise<void> {
    await createRequestRow(page);
    await page.getByRole('treeitem', { name: 'crear pedido' }).click();

    await expect(page.getByRole('tab', { name: 'crear pedido' })).toBeVisible();
}

/** Writes the method and the destination of the request on screen, over what it had. */
export async function aim(page: Page, method: string, path: string): Promise<void> {
    await page.getByRole('button', { name: /^Method / }).click();
    await page.getByRole('menuitem', { exact: true, name: method }).click();

    const url = page.getByRole('textbox', { name: 'URL' });

    await url.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.insertText(`{{baseUrl}}${path}`);
}

/** Sync keeps a request when the person saves it: Ctrl+S from inside its panel. */
export async function saveRequest(page: Page): Promise<void> {
    await page.getByRole('textbox', { name: 'URL' }).click();
    await page.keyboard.press('ControlOrMeta+s');
}

/** The right half of the request, where the answer to the last send is. */
export function responseOf(page: Page) {
    return page.locator('[data-part="response-panel"]');
}

/** Writes one variable into the row of a table of variables `at` lines below the first. */
async function writeVariableRow(
    dialog: Locator,
    at: number,
    name: string,
    value: string,
): Promise<void> {
    await writeRowAt(
        dialog.getByRole('textbox', { exact: true, name: 'Key' }).nth(at),
        dialog.getByRole('textbox', { exact: true, name: 'Value' }).nth(at),
        name,
        value,
    );
}
