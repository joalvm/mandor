// A second origin on the same disk: a shared repo, a link to it, and the doors of the window
// that add the origin, move into it and make a second workspace.

import { execFile } from 'node:child_process';
import { mkdir, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { expect, type Page } from '@playwright/test';

const run = promisify(execFile);

/** What the selector of the window calls the origin every machine starts with. */
export const LOCAL = 'Local';

/** An empty repo no machine owns: the server the origin talks to, with no network in between. */
export async function makeSharedRepo(root: string): Promise<string> {
    const bare = join(root, 'shared');

    await mkdir(bare, { recursive: true });
    await run('git', ['init', '--bare', '--initial-branch=main', bare]);

    return bare;
}

/**
 * The way the window reaches the shared repo. A junction asks for no privilege on Windows and
 * is an ordinary link elsewhere. The address is what the dialog of the origins takes.
 */
export async function linkTo(bare: string, link: string): Promise<string> {
    await symlink(bare, link, 'junction');

    return pathToFileURL(link).href;
}

/** The origin added from the page of origins: a name, an address, the button. */
export async function addOrigin(page: Page, input: { name: string; url: string }): Promise<void> {
    await page.getByRole('button', { exact: true, name: LOCAL }).click();
    await page.getByRole('menuitem', { name: 'Manage origins' }).click();
    await page.getByRole('button', { name: 'Add origins' }).click();

    const dialog = page.getByRole('dialog', { name: 'Add origins' });

    await dialog.getByRole('textbox', { name: 'Name' }).fill(input.name);
    await dialog.getByRole('textbox', { name: 'Address' }).fill(input.url);
    await dialog.getByRole('button', { exact: true, name: 'Add' }).click();

    await expect(
        page.locator('[data-part="origin-row"]').filter({ hasText: input.name }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
}

/** Moves the window into the origin of the menu: its copy opens, and the first sync starts. */
export async function switchToOrigin(page: Page, from: string, to: string): Promise<void> {
    await page.getByRole('button', { exact: true, name: from }).click();
    await page.getByRole('menu').getByText(to, { exact: true }).click();
    await expect(page.getByRole('button', { exact: true, name: to })).toBeVisible();
}

/** A workspace made from the panel the menu of the title row opens, left as the one in use. */
export async function createWorkspaceIn(page: Page, from: string, name: string): Promise<void> {
    await page.getByRole('button', { exact: true, name: from }).click();
    await page.getByRole('menuitem', { name: 'Manage workspaces' }).click();
    await page.getByRole('button', { name: 'New workspace' }).first().click();

    const field = page.getByRole('textbox', { name: 'Workspace name' });

    await expect(field).toBeFocused();
    await field.pressSequentially(name);
    await page.getByRole('button', { exact: true, name: 'Create' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('button', { exact: true, name })).toBeVisible();
}
