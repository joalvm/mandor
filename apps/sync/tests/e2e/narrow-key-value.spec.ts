import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { createRequest, launchSync } from './support/send-flow.js';
import { openSection } from './support/open-section.js';

let root = '';
let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-sync-narrow-'));
    await mkdir(join(root, 'origins'), { recursive: true });
    app = await launchSync(root);
    page = await app.firstWindow();

    await expect(page.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();
    await createRequest(page);
});

test.afterAll(async () => {
    await app.close();
    await rm(root, { force: true, maxRetries: 10, recursive: true });
});

test('in the smallest window the description of a param goes under key and value', async () => {
    await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.setSize(1024, 640);
    });
    await openSection(page, 'Params');

    const panel = page.getByRole('tabpanel', { name: 'Params' });
    const table = panel.locator('[data-part="key-value-table"]');

    await expect(table).toHaveAttribute('data-kv-stacked', 'true');
    await expect(panel.getByRole('columnheader', { name: 'Description' })).toHaveCount(0);

    const ghost = panel.locator('[data-kv-row="ghost"]');

    await ghost.getByRole('textbox', { name: 'Key' }).click();
    await page.keyboard.type('page');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const row = panel.locator('[data-part="key-value-row"]').first();
    const description = row.getByRole('textbox', { name: 'Description' });

    await expect(description).toBeFocused();

    const under = await description.boundingBox();
    const key = await row.getByRole('textbox', { name: 'Key' }).boundingBox();

    expect(under?.y ?? 0).toBeGreaterThan(key?.y ?? Infinity);
    expect(under?.height ?? 0).toBeGreaterThan(0);
});
