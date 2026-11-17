import { expect, type Page } from '@playwright/test';

/**
 * Switches the connection to Socket.IO the only way the window offers: its settings, opened from
 * the row it lives in. A connection is made for one transport, so the switch is a setting and
 * not a control of the address bar. The url moves with the transport it dials — the ws:// of the
 * creation becomes the http:// of Socket.IO by itself.
 */
export async function chooseSocketIo(page: Page, connection: string): Promise<void> {
    const row = page.getByRole('option', { name: new RegExp(connection) });

    await row.getByRole('button', { name: 'Connection actions' }).click();
    await page.getByRole('menuitem', { exact: true, name: 'Settings' }).click();

    const dialog = page.getByRole('dialog', { name: 'Connection' });

    await dialog.getByRole('combobox', { name: 'Transport' }).click();
    await page.getByRole('option', { exact: true, name: 'Socket.IO' }).click();
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
}
