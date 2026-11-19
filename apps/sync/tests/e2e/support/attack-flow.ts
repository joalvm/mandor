import { access, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, type Page } from '@playwright/test';

import { ATTACK, ATTACK_MARK } from '../../../../../tools/workspace/malicious-repo.mjs';
import type { Sandbox } from './launch-app.js';
import { switchToOrigin } from './origin-flow.js';

/** What the app calls the origin every run starts on, and the band of an unapproved script. */
export const LOCAL = 'Local';
export const BAND = 'It does not run until you approve it';
export const SCRIPT_FAILED = 'A script failed, so nothing went out';

/** The clone of the hostile origin: the one repo beside `local` the run never made itself. */
export async function hostileRepoRoot(sandbox: Sandbox): Promise<string> {
    const siblings = await readdir(join(sandbox.root, 'origins', 'sync'));

    return join(
        sandbox.root,
        'origins',
        'sync',
        siblings.find((name) => name !== 'local') ?? 'none',
    );
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

/** Opens one request of the hostile collection by its name in the tree. */
export async function openItem(page: Page, name: string): Promise<void> {
    await page.getByRole('treeitem', { exact: true, name }).click();
    await expect(page.getByRole('tab', { name })).toBeVisible();
}

/** Sends the request on screen, once; every test waits for what it expects out of it. */
export async function send(page: Page): Promise<void> {
    await page.getByRole('button', { exact: true, name: 'Send' }).click();
}

/** The hostile scripts a send left out, read and approved one by one, the way a person would. */
export async function approveWhatWasLeftOut(page: Page, count: number): Promise<void> {
    await page.getByRole('button', { name: 'Review', exact: true }).click();

    const title = `${String(count)} script${count === 1 ? '' : 's'} left out`;
    const dialog = page.getByRole('dialog', { name: title });
    const left = dialog.getByRole('option');

    await expect(left).toHaveCount(count);

    for (let index = 0; index < count; index += 1) {
        await left.nth(index).click();
        await dialog.getByRole('button', { exact: true, name: 'Approve' }).click();
        await expect(dialog.getByText('Approved: it runs from the next send')).toBeVisible();
    }

    await dialog.getByRole('button', { exact: true, name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);
}

/** Sends once so the review offers the scripts, approves them all, and sends again. */
export async function sendApproved(page: Page, count: number): Promise<void> {
    await send(page);
    await expect(
        page.getByText(`Sent without ${String(count)} unapproved script${count === 1 ? '' : 's'}`),
    ).toBeVisible();
    await approveWhatWasLeftOut(page, count);
    await send(page);
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

/** The hostile origin added and opened, the way a person opens what a team shares. */
export async function openHostileOrigin(page: Page, url: string): Promise<void> {
    await page.getByRole('button', { exact: true, name: LOCAL }).click();
    await page.getByRole('menuitem', { name: 'Manage origins' }).click();
    await page.getByRole('button', { name: 'Add origins' }).click();

    const dialog = page.getByRole('dialog', { name: 'Add origins' });

    await dialog.getByRole('textbox', { name: 'Name' }).fill(ATTACK.originName);
    await dialog.getByRole('textbox', { name: 'Address' }).fill(url);
    await dialog.getByRole('button', { exact: true, name: 'Add' }).click();
    await expect(
        page.locator('[data-part="origin-row"]').filter({ hasText: ATTACK.originName }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await switchToOrigin(page, LOCAL, ATTACK.originName);
    await expect(page.getByRole('treeitem', { name: ATTACK.collection })).toBeVisible({
        timeout: 60_000,
    });
}

/** The secret only this machine keeps: the value of the declared variable, written by hand. */
export async function giveTheSecret(page: Page, secret: string): Promise<void> {
    const picker = page.locator('[data-part="title-environment"]').getByRole('button');

    // The workspace arrived with one environment, not yet the chosen one: choosing it is what
    // makes every send of the collection resolve against the variable the scripts want.
    await picker.click();
    await page.getByRole('menuitem', { name: 'Local' }).click();
    await picker.click();
    await page.getByRole('menuitem', { name: 'Manage environments' }).click();

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
