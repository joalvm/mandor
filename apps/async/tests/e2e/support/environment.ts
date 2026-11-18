import { expect, type Locator, type Page } from '@playwright/test';

/** The name the app gives an environment created from the picker, with nobody typing it. */
const ENVIRONMENT = 'Local';

/**
 * The select by its part, not by name: the origin of these runs is also called «Local». It is
 * the first part of the address bar of the connection in front.
 */
export function environmentPicker(page: Page): Locator {
    return page.locator('[data-part="environment-select"]').first();
}

/**
 * Creates the environment of the workspace with one variable, from the title bar, and leaves the
 * dialog closed behind it. Creating one chooses it for nobody: in this app the environment
 * belongs to the connection on screen, so a connection that needs it says so through
 * `chooseEnvironment`.
 */
export async function createEnvironment(page: Page, name: string, value: string): Promise<void> {
    await page
        .locator('[data-part="titlebar"]')
        .getByRole('button', { exact: true, name: 'Manage environments' })
        .click();

    const dialog = page.getByRole('dialog', { name: 'Environments' });

    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { exact: true, name: 'Create environment' }).click();
    await expect(dialog.getByText(ENVIRONMENT, { exact: true }).first()).toBeVisible();
    await writeVariableRow(dialog, 0, name, value);
    await dialog.getByRole('button', { exact: true, name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);
}

/** Hands the environment to the connection the window is looking at. */
export async function chooseEnvironment(page: Page): Promise<void> {
    await environmentPicker(page).click();
    await page.getByRole('menuitem', { name: ENVIRONMENT }).click();
    await expect(environmentPicker(page)).toHaveText(ENVIRONMENT);
}

/**
 * Writes one variable into the empty row that closes a table of variables, the one `at` lines
 * below the first. The first keystroke turns the empty row into a line and the focus follows
 * it, so the rest of the name lands in the line it gave birth to.
 */
export async function writeVariableRow(
    dialog: Locator,
    at: number,
    name: string,
    value: string,
): Promise<void> {
    const key = dialog.getByRole('textbox', { exact: true, name: 'Key' }).nth(at);
    const field = dialog.getByRole('textbox', { exact: true, name: 'Value' }).nth(at);

    await key.click();
    await key.pressSequentially(name);
    await expect(key).toHaveText(name);
    await field.click();
    await field.pressSequentially(value);
    await expect(field).toHaveText(value);
}
