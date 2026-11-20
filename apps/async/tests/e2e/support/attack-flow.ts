import { access } from 'node:fs/promises';

import { expect, type Locator, type Page } from '@playwright/test';

import { ATTACK_MARK } from '../../../../../tools/workspace/malicious-repo.mjs';

/** The moments a connection hooks, and the band of an unapproved script. */
export const BEFORE = 'Before connecting';
export const ON_MESSAGE = 'On messages';
const BAND = 'It does not run until you approve it';

export const SCRIPT_FAILED = 'A script failed, so nothing went out';

export function rowsOf(page: Page, direction: 'in' | 'out', text: string) {
    return page
        .locator(`[data-part="activity-row"][data-direction="${direction}"]`)
        .filter({ hasText: text });
}

/** The lines of the scripts, the newest first: the timeline reads from the top down. */
export function scriptRows(page: Page) {
    return page.locator('[data-part="activity-script-row"]');
}

export function consolePanel(page: Page) {
    return page.getByRole('region', { name: 'Console' });
}

/** Opens the console from the status bar, reads it, and puts it away again. */
export async function inConsole(page: Page, read: () => Promise<void>): Promise<void> {
    await page.getByRole('button', { name: 'Show the console' }).click();
    await read();
    await consolePanel(page).getByRole('button', { name: 'Hide the console' }).click();
    await expect(consolePanel(page)).toHaveCount(0);
}

/** The settings of one connection, opened on the script of one moment. */
async function openScript(page: Page, connection: string, event: string): Promise<Locator> {
    await page
        .getByRole('option', { name: new RegExp(connection) })
        .getByRole('button', { name: 'Connection actions' })
        .click();
    await page.getByRole('menuitem', { exact: true, name: 'Settings' }).click();

    // The dialog takes the name of the section it shows: it is the only one open.
    const dialog = page.getByRole('dialog');

    await dialog.getByRole('option', { name: 'Scripts' }).click();
    await dialog.getByRole('tab', { exact: true, name: event }).click();

    return dialog;
}

/** Approves the script of one moment of one connection from its band, and closes the settings. */
export async function approveScript(page: Page, connection: string, event: string): Promise<void> {
    const dialog = await openScript(page, connection, event);

    await expect(dialog.getByText(BAND)).toBeVisible();
    await dialog.getByRole('button', { exact: true, name: 'Approve' }).click();
    await expect(dialog.getByText(BAND)).toHaveCount(0);
    await dialog.getByRole('button', { exact: true, name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);
}

/** Whether the script of one moment of one connection wears the band of an unapproved one now. */
export async function waitsForApproval(
    page: Page,
    connection: string,
    event: string,
): Promise<boolean> {
    const dialog = await openScript(page, connection, event);
    const waits = (await dialog.getByText(BAND).count()) > 0;

    await dialog.getByRole('button', { exact: true, name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);

    return waits;
}

/** Puts one connection of the hostile origin on screen, in its tab. */
export async function openConnection(page: Page, name: string): Promise<void> {
    await page.getByRole('option', { name: new RegExp(name) }).click();
    await expect(page.getByRole('tab', { name: new RegExp(name) })).toBeVisible();
}

export async function connect(page: Page): Promise<void> {
    await page.getByRole('button', { exact: true, name: 'Connect' }).click();
    await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toBeVisible();
}

export async function disconnect(page: Page): Promise<void> {
    await page.getByRole('button', { exact: true, name: 'Disconnect' }).click();
    await expect(page.getByRole('button', { exact: true, name: 'Connect' })).toBeVisible();
}

/** Flips the switch every script of the app answers to, and leaves the settings closed. */
export async function switchScripts(page: Page, on: boolean): Promise<void> {
    await page.getByRole('button', { name: 'Settings' }).click();

    // The dialog takes the name of the section it shows: it is the only one open.
    const dialog = page.getByRole('dialog');

    await dialog.getByRole('option', { name: 'Scripts' }).click();

    const toggle = dialog.getByRole('switch', { name: 'Run scripts' });

    await toggle.click();
    await expect(toggle).toBeChecked({ checked: on });
    await dialog.getByRole('button', { exact: true, name: 'Close settings' }).click();
    await expect(dialog).toHaveCount(0);
}

/** Whether the mark an escape would plant outside the repo is on this machine. */
export async function markPlanted(): Promise<boolean> {
    return access(ATTACK_MARK).then(
        () => true,
        () => false,
    );
}

/** The secret only this machine keeps: the value of the declared variable, written by hand. */
export async function giveTheSecret(page: Page, secret: string): Promise<void> {
    await page
        .locator('[data-part="titlebar"]')
        .getByRole('button', { exact: true, name: 'Manage environments' })
        .click();

    const dialog = page.getByRole('dialog', { name: 'Environments' });

    // The secret variable is the one row that wears the badge: its key is an editor whose text
    // a locator cannot read, but its mark it wears on the outside.
    const row = dialog
        .locator('[data-part="key-value-row"]')
        .filter({ hasText: /secret/u })
        .first();

    // The eye sits beside the actions of the row, and their icons answer for the pointer before
    // it: the reveal is asked for with the keyboard, which no overlap can stand in the way of.
    const eye = row.getByRole('button', { name: 'Reveal value' });

    await eye.focus();
    await page.keyboard.press('Enter');
    await row.getByRole('textbox', { exact: true, name: 'Value' }).fill(secret);
    await dialog.getByRole('button', { exact: true, name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);
}
