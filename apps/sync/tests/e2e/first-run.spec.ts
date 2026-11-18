import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import { PERSONAL, workspaceDir } from './support/disk-names.js';
import { launch, makeSandbox } from './support/launch-app.js';

const DOC = 'sync-notes.md';

/** What the list and the tab call it: the name of the file without the extension. */
const DOC_TITLE = 'sync-notes';
const CONTENT = '# Persisted by Mandor Request';

async function editDoc(page: Page, repoRoot: string): Promise<void> {
    await expect(page.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();

    const docDir = join(repoRoot, await workspaceDir(repoRoot, PERSONAL), 'docs');
    const docPath = join(docDir, DOC);

    await mkdir(docDir, { recursive: true });
    await writeFile(docPath, '# Initial Sync note', 'utf8');
    await page.getByRole('button', { name: 'Docs', exact: true }).click();
    await page.getByRole('button', { name: 'Docs', exact: true }).click();
    await page.getByRole('option', { name: DOC_TITLE }).click();
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await editorLines(page, 'doc-tab').click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type(CONTENT);
    await expect.poll(() => readFile(docPath, 'utf8')).toBe(CONTENT);
}

/** Main writes a Sync origin; renderer edits its document; a fresh process reads it again. */
test('creates the Sync origin and restores a document written through its renderer', async () => {
    const { defaultRepoRoot, repoRoot, root, userDataDir } = await makeSandbox();
    let running: ElectronApplication | undefined;

    try {
        const first = await launch(userDataDir, defaultRepoRoot);

        running = first.app;
        await editDoc(first.page, repoRoot);
        await running.close();
        running = undefined;

        const reopened = await launch(userDataDir, defaultRepoRoot);
        const second = reopened.page;

        running = reopened.app;

        await expect(second.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();
        await second.getByRole('option', { name: DOC_TITLE }).click();
        await expect(
            second.getByRole('heading', { name: 'Persisted by Mandor Request' }),
        ).toBeVisible();
        await expect(access(join(defaultRepoRoot, 'async'))).rejects.toThrow();
    } finally {
        await running?.close();
        await rm(root, { force: true, maxRetries: 10, recursive: true });
    }
});
