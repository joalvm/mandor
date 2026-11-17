import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test, type ElectronApplication } from '@playwright/test';

import { defaultWorkspaceDir, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox } from './support/launch-app.js';

const SEGMENT = 'x9k2m4p7q1w3';
const NAME = 'Pedido roto';
const TEXT = `1 file could not be read: ${NAME}`;

/** The broken file arrives like one from another machine, under a segment that says nothing. */
async function leaveBrokenConnection(repoRoot: string): Promise<void> {
    const connections = join(repoRoot, await defaultWorkspaceDir(repoRoot), 'connections');

    await mkdir(connections, { recursive: true });
    await writeFile(
        join(connections, `${SEGMENT}.yaml`),
        `name: ${NAME}\nurl: [unclosed\n`,
        'utf8',
    );
}

test('a file that cannot be read is told by the name it carries, never by its path', async () => {
    const sandbox = await makeSandbox();
    let running: ElectronApplication | undefined;

    try {
        // The first run lays the workspace out; only then is there a place for the broken file.
        const first = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

        await expectFirstRun(first.page);
        await first.app.close();

        await leaveBrokenConnection(sandbox.repoRoot);

        const launched = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

        running = launched.app;

        const { page } = launched;

        await expect(page.getByText(TEXT).first()).toBeVisible();

        await page.getByRole('button', { name: /^Notices/ }).click();

        const centre = page.getByRole('dialog', { name: 'Notices' });

        await expect(centre).toContainText(TEXT);
        await expect(page.locator('body')).not.toContainText(sandbox.root);
        await expect(page.locator('body')).not.toContainText(SEGMENT);
    } finally {
        if (running !== undefined) {
            await running.close();
        }

        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
