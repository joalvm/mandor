import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { createRequest, launchSync } from './support/send-flow.js';
import { openSection } from '../../../../packages/ui/tests/support/open-section.js';

let root = '';
let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-sync-sections-scroll-'));
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

/**
 * The settings of a request are taller than its half in the smallest window: the wheel over them
 * brings the last row into the section, instead of leaving it cut at the edge of the card. The
 * geometry is the requirement, so it is measured.
 */
test('the wheel reaches the last setting of a request in the smallest window', async () => {
    await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.setSize(1024, 640);
    });
    await openSection(page, 'Settings');

    const panel = page.getByRole('tabpanel', { name: 'Settings' });
    const last = panel.getByRole('textbox', { name: 'Cipher suites' });

    await panel.hover();
    await page.mouse.wheel(0, 4000);

    await expect(async () => {
        const section = await panel.boundingBox();
        const field = await last.boundingBox();

        expect(field?.y ?? Infinity).toBeGreaterThanOrEqual(section?.y ?? 0);
        expect((field?.y ?? Infinity) + (field?.height ?? 0)).toBeLessThanOrEqual(
            (section?.y ?? 0) + (section?.height ?? 0),
        );
    }).toPass({ timeout: 5_000 });
});
