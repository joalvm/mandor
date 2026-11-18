import { expect, test } from '@playwright/test';

import { launch, makeSandbox } from './support/launch-app.js';
import { createWorkspace, openWorkspacesPanel } from './support/exchange-flow.js';

/** The open workspace is deleted like any other: the window goes on in the one that is left. */
test('the workspace that is open can be deleted, and the window moves to another', async () => {
    const { defaultRepoRoot, userDataDir } = await makeSandbox();
    const { app, page } = await launch(userDataDir, defaultRepoRoot);

    try {
        await openWorkspacesPanel(page, 'Personal');
        await createWorkspace(page, 'Segunda');
        await expect(page.getByRole('button', { exact: true, name: 'Segunda' })).toBeVisible();

        await page
            .getByRole('row', { name: /Segunda/ })
            .getByRole('button', { name: 'Workspace options' })
            .click();
        await page.getByRole('menuitem', { name: 'Delete' }).click();
        await page
            .getByRole('alertdialog', { name: 'Delete Segunda?' })
            .getByRole('button', { name: 'Delete' })
            .click();

        await expect(page.getByRole('button', { exact: true, name: 'Personal' })).toBeVisible();
        await expect(page.getByRole('row', { name: /Segunda/ })).toHaveCount(0);
    } finally {
        await app.close();
    }
});
