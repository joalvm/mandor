import { rm } from 'node:fs/promises';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox } from './support/launch-app.js';
import { seedDoc } from './support/seed-doc.js';

const DOC = 'notes.md';

/** What the list and the tab call it: the name of the file without the extension. */
const DOC_TITLE = 'notes';
const MARKDOWN = '[data-part="markdown"]';
const PAGE = '[data-part="doc-page"]';

/** Folds the section and opens it again, which is what reads the docs folder a second time. */
async function openSeededDoc(page: Page): Promise<void> {
    const section = page.getByRole('button', { exact: true, name: 'Docs' });

    await section.click();
    await section.click();
    await page.getByRole('option', { name: DOC_TITLE }).click();
    await expect(page.locator(MARKDOWN)).toBeVisible();
}

/** The wheel turned a notch away from the reader with the zoom key held, over the page. */
async function zoomInOverPage(page: Page): Promise<void> {
    await page.locator(PAGE).hover();
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -100);
    await page.keyboard.up('Control');
}

/** The first run: a note of the workspace, read at the size of the app and then a notch larger. */
async function enlargeNote(page: Page, repoRoot: string): Promise<void> {
    await expectFirstRun(page);
    await seedDoc(repoRoot, DOC, `# ${DOC_TITLE}\n\nSome text to read.\n`);
    await openSeededDoc(page);
    await expect(page.locator(MARKDOWN)).toHaveCSS('zoom', '1');
    await zoomInOverPage(page);
    await expect(page.locator(MARKDOWN)).toHaveCSS('zoom', '1.1');
}

/** The window that comes back reads the note at the size it was left at, until the zero. */
async function findNoteEnlarged(page: Page): Promise<void> {
    await expectFirstRun(page);
    await page.getByRole('option', { name: DOC_TITLE }).click();
    await expect(page.locator(MARKDOWN)).toHaveCSS('zoom', '1.1');
    await page.locator(PAGE).hover();
    await page.keyboard.press('Control+0');
    await expect(page.locator(MARKDOWN)).toHaveCSS('zoom', '1');
}

/**
 * The page of a doc is resized as a whole, a tenth for each notch, by a rule of its sheet that
 * reads the step off the page: the zoom the window laid out is the requirement, so it is read off
 * the computed style. The step is the reader's and survives the window, and the zoom key with the
 * zero, the pointer resting over a page that holds no focus, brings it back.
 */
test('resizes the page of a doc under the wheel, keeps the size, and puts it back with the zero', async () => {
    const sandbox = await makeSandbox();
    const { defaultRepoRoot, userDataDir } = sandbox;
    let running: ElectronApplication | undefined;

    try {
        const first = await launch(userDataDir, defaultRepoRoot);

        running = first.app;
        await enlargeNote(first.page, sandbox.repoRoot);
        await running.close();
        running = undefined;

        const second = await launch(userDataDir, defaultRepoRoot);

        running = second.app;
        await findNoteEnlarged(second.page);
    } finally {
        if (running !== undefined) {
            await running.close();
        }

        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
