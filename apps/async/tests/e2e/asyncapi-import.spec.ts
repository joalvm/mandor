import { readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { expectFirstRun, DEFAULT_WORKSPACE } from './support/first-run.js';
import { launch, makeSandbox } from './support/launch-app.js';

const FIXTURE = readFileSync(
    fileURLToPath(
        new URL(
            '../../../../packages/interop-formats/tests/asyncapi/fixtures/pasarela-3.yaml',
            import.meta.url,
        ),
    ),
    'utf8',
);

// The door sits in the heading of the collections, beside the one that makes a collection.
async function openImportDialog(page: Page): Promise<void> {
    await expect(page.getByRole('button', { name: DEFAULT_WORKSPACE })).toBeVisible();
    await page.getByRole('button', { name: 'Import a document' }).click();
}

// The drop hands the file over the way the browser does; no path is typed anywhere.
async function expectCollection(page: Page): Promise<void> {
    // The refreshed collection holds the group the document tagged and the event the wire
    // names, and not the row that was left out.
    await expect(page.getByRole('treeitem', { name: /recibos/ }).first()).toBeVisible();
    await expect(page.getByRole('treeitem', { name: /avisos\/salientes/ })).toHaveCount(0);
}

// The import writes the collection and nothing else: no report doc opens in front of it.
async function expectNoReport(page: Page): Promise<void> {
    await expect(page.getByRole('tab', { name: /^Import report/ })).toHaveCount(0);
}

async function dropDocument(page: Page): Promise<void> {
    const dropzone = page.getByRole('region', { name: 'Drop the document here' });

    await expect(dropzone).toBeVisible();

    await dropzone.evaluate((element, content) => {
        const file = new File([content], 'pasarela.yaml', { type: 'text/yaml' });
        const drop = new DragEvent('drop', { bubbles: true });

        Object.defineProperty(drop, 'dataTransfer', { value: { files: [file], items: [] } });
        element.dispatchEvent(drop);
    }, FIXTURE);
}

// The summary card names the document, and the tree starts folded to the top level, under the
// line that holds everything.
async function expectFoldedPlan(page: Page): Promise<void> {
    // The name is said twice: the summary card and the collection the plan would write.
    await expect(page.getByText('Pasarela', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('tree', { name: 'What would enter' })).toBeVisible();
    await expect(page.getByRole('treeitem', { name: 'Everything' })).toBeVisible();
}

test('imports an AsyncAPI document, but only what the user left marked', async () => {
    const sandbox = await makeSandbox();
    const { defaultRepoRoot, userDataDir } = sandbox;
    let running: ElectronApplication | undefined;

    try {
        const first = await launch(userDataDir, defaultRepoRoot);

        running = first.app;

        const page = first.page;

        await expectFirstRun(page);
        await openImportDialog(page);
        await dropDocument(page);

        await expectFoldedPlan(page);

        // One row goes out of the import on the user's word alone. The side arrows unfold from
        // the keyboard, as a press on the row does.
        await page.getByRole('treeitem', { name: /avisos/ }).press('ArrowRight');

        await page
            .getByRole('treeitem', { name: /avisos\/salientes/ })
            .getByRole('checkbox')
            .uncheck();

        await page.getByRole('button', { name: 'Import', exact: true }).click();

        await expect(page.getByRole('tree', { name: 'What would enter' })).toBeHidden();
        await expectCollection(page);
        await expectNoReport(page);
    } finally {
        if (running !== undefined) {
            await running.close();
        }

        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
