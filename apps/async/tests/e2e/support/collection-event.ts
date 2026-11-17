import { expect, type Page } from '@playwright/test';

/** The folder every run files its event under: the collection only creates folders at the root. */
const EVENT_FOLDER = 'events';

/**
 * Names the message just made from its row: it is born under its word, and the name changes from
 * the row menu.
 */
export async function nameNewMessage(page: Page, name: string): Promise<void> {
    const born = page.getByRole('treeitem', { exact: true, name: 'New message' });

    await born.getByRole('button', { name: 'Row options' }).click();
    await page.getByRole('menuitem', { exact: true, name: 'Rename' }).click();
    await page.getByRole('textbox', { name: 'New name' }).fill(name);
    await page.getByRole('textbox', { name: 'New name' }).press('Enter');
}

/**
 * Makes one event the way the collection menu makes it: a folder at the root, and a message
 * inside it.
 *
 * A connection holding no event shows the page that asks for one, so a run that means to reach
 * the composer comes through here first. The event is of the workspace and not of the
 * connection: it is made once and any connection of the window can pick it up.
 */
export async function createEvent(page: Page, name: string): Promise<void> {
    await page.getByRole('button', { name: 'New collection' }).click();
    await page.getByRole('textbox', { name: 'New name' }).fill(EVENT_FOLDER);
    await page.getByRole('textbox', { name: 'New name' }).press('Enter');

    const folder = page.getByRole('treeitem', { name: EVENT_FOLDER });

    await expect(folder).toBeVisible();
    await folder.getByRole('button', { name: 'Row options' }).click();
    await page.getByRole('menuitem', { name: 'New message' }).click();
    await nameNewMessage(page, name);
    await expect(page.getByRole('treeitem', { name })).toBeVisible();
}

/**
 * Lands the event in the composer of the connection being worked in; no tab of its own opens.
 * Choosing it again is how a connection that came back without one gets it back.
 */
export async function openEvent(page: Page, name: string): Promise<void> {
    await page.getByRole('treeitem', { name }).click();
    await expect(composerOf(page)).toBeVisible();
}

/** The composer of the connection in front, which is the only one the run can type into. */
export function composerOf(page: Page) {
    return page.getByRole('group', { name: 'Message composer' }).first();
}
