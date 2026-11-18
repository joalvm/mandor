import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Locator, type Page } from '@playwright/test';

import { diskTree, entityNamed, onDisk } from '../../../../tools/workspace/disk-by-name.mjs';
import { localRepo, PERSONAL, workspaceDir } from './support/disk-names.js';
import { pickerOf } from './support/import-flow.js';
import { createEnvironment, createRequest, launchSync } from './support/send-flow.js';
import { openSection } from './support/open-section.js';

/** Thousands of variables, the table that drew every one of them and froze the dialog. */
const COUNT = 3000;

/** A screenful of rows and the ones always kept; a table drawn whole is a hundred times this. */
const DRAWN_AT_MOST = 100;

const SEED = 'http://seed.test';

// One app runs through both tables: the second starts where the first one closed its dialog.
test.describe.configure({ mode: 'serial' });

let root = '';
let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-sync-long-environment-'));
    await mkdir(join(root, 'origins'), { recursive: true });
    app = await launchSync(root);
    page = await app.firstWindow();

    await expect(page.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();
});

test.afterAll(async () => {
    await app.close();
    await rm(root, { force: true, maxRetries: 10, recursive: true });
});

function nameAt(index: number): string {
    return `v${String(index).padStart(4, '0')}`;
}

/** The environment the app wrote, rewritten from outside with thousands of variables. */
async function growEnvironment(): Promise<void> {
    const repo = localRepo(root);
    const tree = diskTree(repo);
    const dir = `${await workspaceDir(repo, PERSONAL)}/environments`;
    const path = onDisk(await entityNamed(tree, dir, 'Local'), 'the environment');

    await expect.poll(() => tree.read(path)).toContain(`value: ${SEED}`);

    const id = /^id: (.+)$/m.exec(await tree.read(path))?.[1] ?? '';
    const variables = Array.from({ length: COUNT }, (_, index) =>
        [
            `  - name: ${nameAt(index)}`,
            `    value: value ${String(index)}`,
            '    enabled: true',
            '    secret: false',
        ].join('\n'),
    );

    await writeFile(
        join(repo, path),
        `id: ${id}\nname: Local\nvariables:\n${variables.join('\n')}\n`,
    );
}

function keyOf(dialog: Locator, index: number): Locator {
    return dialog.getByRole('textbox', { exact: true, name: 'Key' }).filter({
        hasText: new RegExp(`^${nameAt(index)}$`),
    });
}

/** The indexes of the pairs in the DOM, read from the rows the window drew. */
function drawnIndexes(dialog: Locator): Promise<number[]> {
    return dialog
        .locator('[data-part="key-value-row"][data-index]')
        .evaluateAll((rows) => rows.map((row) => Number((row as HTMLElement).dataset['index'])));
}

/**
 * A table of thousands holds a screenful of rows in the DOM wherever it is hosted; the arrow
 * from the last pair lands on the one before it, and the wheel brings the middle of the table.
 */
async function expectWindowed(table: Locator): Promise<void> {
    await expect(keyOf(table, COUNT - 1)).toBeVisible();
    expect((await drawnIndexes(table)).length).toBeLessThan(DRAWN_AT_MOST);

    // The last pair stands at the end of the whole table: the scroll reaches it, not a cliff.
    await keyOf(table, COUNT - 1).click();
    await page.keyboard.press('ArrowUp');
    await expect(keyOf(table, COUNT - 2)).toBeFocused();
    await expect(keyOf(table, COUNT - 2)).toBeInViewport();

    await page.mouse.wheel(0, -40_000);
    await expect
        .poll(async () => (await drawnIndexes(table)).some((at) => at > 100 && at < COUNT - 100))
        .toBe(true);
    expect((await drawnIndexes(table)).length).toBeLessThan(DRAWN_AT_MOST);
}

test('an environment of thousands opens with a screenful of rows, and the arrows walk it', async () => {
    await createEnvironment(page, SEED);
    await growEnvironment();
    await pickerOf(page).click();
    await page.getByRole('menuitem', { name: 'Manage environments' }).click();

    const dialog = page.getByRole('dialog', { name: 'Environments' });

    await expectWindowed(dialog);
    await dialog.getByRole('button', { exact: true, name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);
});

/** The panel of a request scrolls on its own, not in a dialog: the window finds that box. */
test('thousands of headers pasted as text come back as a screenful of rows', async () => {
    await createRequest(page);
    await openSection(page, 'Headers');

    const panel = page.getByRole('tabpanel', { name: 'Headers' }).first();
    const text = Array.from({ length: COUNT }, (_, index) => `${nameAt(index)}:${String(index)}`);

    await panel.getByRole('button', { exact: true, name: 'Bulk edit' }).click();
    await panel.getByRole('textbox', { name: 'Bulk edit of pairs' }).fill(text.join('\n'));
    await panel.getByRole('button', { exact: true, name: 'Key-value edit' }).click();

    await expectWindowed(panel);
});
