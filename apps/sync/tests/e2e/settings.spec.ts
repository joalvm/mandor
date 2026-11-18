import { rm } from 'node:fs/promises';

import { expect, test, type ElectronApplication } from '@playwright/test';
import { launch, makeSandbox } from './support/launch-app.js';

/** The settings of Sync are its own: the language chosen there is the one it opens in again. */
test('changes the language from its settings and keeps it after relaunch', async () => {
    const sandbox = await makeSandbox();
    let running: ElectronApplication | undefined;

    try {
        const first = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);
        const { page } = first;

        running = first.app;

        await page.getByRole('button', { name: 'Settings', exact: true }).click();
        await page.getByRole('combobox', { name: 'Language' }).click();
        await page.getByRole('option', { name: 'Spanish' }).click();
        await page.keyboard.press('Escape');
        await expect(
            page.getByRole('button', { name: 'Configuración', exact: true }),
        ).toBeVisible();
        await running.close();
        running = undefined;

        const reopened = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);
        const second = reopened.page;

        running = reopened.app;

        await expect(
            second.getByRole('button', { name: 'Configuración', exact: true }),
        ).toBeVisible();
        await expect(second.locator('html')).toHaveAttribute('lang', 'es');
    } finally {
        await running?.close();
        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
