import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Locator, type Page } from '@playwright/test';

import { diskTree, entityNamed, onDisk } from '../../../../tools/workspace/disk-by-name.mjs';
import { createEnvironment } from './support/environment.js';
import { defaultWorkspaceDir, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox, type Sandbox } from './support/launch-app.js';

/** Thousands of variables, the table that drew every one of them and froze the dialog. */
const COUNT = 3000;

/** A screenful of rows and the ones always kept; a table drawn whole is a hundred times this. */
const DRAWN_AT_MOST = 100;

let sandbox: Sandbox;
let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
    sandbox = await makeSandbox();

    const launched = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

    app = launched.app;
    page = launched.page;
    await expectFirstRun(page);
});

test.afterAll(async () => {
    await app.close();
    await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
});

function nameAt(index: number): string {
    return `v${String(index).padStart(4, '0')}`;
}

/** The environment the app wrote, rewritten from outside with thousands of variables. */
async function growEnvironment(): Promise<void> {
    const tree = diskTree(sandbox.repoRoot);
    const dir = `${await defaultWorkspaceDir(sandbox.repoRoot)}/environments`;
    const path = onDisk(await entityNamed(tree, dir, 'Local'), 'the environment');

    await expect.poll(() => tree.read(path)).toContain('value: seed');

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
        join(sandbox.repoRoot, path),
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

test('an environment of thousands opens with a screenful of rows, and the arrows walk it', async () => {
    await createEnvironment(page, 'seed', 'seed');
    await growEnvironment();
    await page
        .locator('[data-part="titlebar"]')
        .getByRole('button', { exact: true, name: 'Manage environments' })
        .click();

    const dialog = page.getByRole('dialog', { name: 'Environments' });

    await expect(keyOf(dialog, COUNT - 1)).toBeVisible();
    expect((await drawnIndexes(dialog)).length).toBeLessThan(DRAWN_AT_MOST);

    // The last pair stands at the end of the whole table: the scroll reaches it, not a cliff.
    await keyOf(dialog, COUNT - 1).click();
    await page.keyboard.press('ArrowUp');
    await expect(keyOf(dialog, COUNT - 2)).toBeFocused();
    await expect(keyOf(dialog, COUNT - 2)).toBeInViewport();

    await page.mouse.wheel(0, -40_000);
    await expect
        .poll(async () => (await drawnIndexes(dialog)).some((at) => at > 100 && at < COUNT - 100))
        .toBe(true);
    expect((await drawnIndexes(dialog)).length).toBeLessThan(DRAWN_AT_MOST);
});
