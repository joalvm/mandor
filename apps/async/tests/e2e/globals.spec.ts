import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { startEchoServer } from '../../../../packages/transport-async/tests/support/echo-server.js';
import { composerOf, openEvent } from './support/collection-event.js';
import { launch, makeSandbox } from './support/launch-app.js';

/**
 * No secret global takes part here on purpose: declaring one asks the keychain of the system to
 * keep the value, and the container has none. That a secret global leaves hidden at every border
 * is proven where `readSecret` is a dependency (`global-secret-redaction.test.ts`).
 */

/**
 * An origin a build before the globals saved: format 1, the host of the echo and the text of a
 * message as variables of its workspace, and a connection that chose no environment.
 */
async function writeOldOrigin(repo: string, host: string): Promise<void> {
    const variable = (name: string, value: string): string =>
        `  - name: ${name}\n    value: "${value}"\n    enabled: true\n    secret: false\n`;
    const files: Record<string, string> = {
        'mandor.yaml': 'formatVersion: 1\nname: Local\nworkspaces:\n  - personal\n',
        'workspaces/personal/workspace.yaml': `id: personal\nname: Personal\nkind: async\nvariables:\n${variable('host', host)}${variable('saludo', 'del workspace')}`,
        'workspaces/personal/connections/eco.yaml':
            'id: eco\nname: Eco\ntransport: websocket\nurl: "ws://{{host}}/"\nheaders: []\nenvironmentId: null\n',
        'workspaces/personal/collections/collections.yaml': 'order:\n  - eventos\n',
        'workspaces/personal/collections/eventos/collection.yaml':
            'name: Eventos\norder:\n  - hola\n',
        'workspaces/personal/collections/eventos/hola.yaml':
            'kind: message\nname: Hola\npayloadType: text\npayload: "{{saludo}}"\n',
    };

    for (const [path, text] of Object.entries(files)) {
        await mkdir(join(repo, path, '..'), { recursive: true });
        await writeFile(join(repo, path), text, 'utf8');
    }
}

/** Opens Eco, loads the message of the collection into its composer and sends it. */
async function connectAndSend(page: Page): Promise<void> {
    await page.getByRole('option', { name: /Eco/ }).click();
    await page.getByRole('button', { exact: true, name: 'Connect' }).click();
    await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toBeVisible();
    await page.getByRole('treeitem', { name: 'Eventos' }).click();
    await page.keyboard.press('ArrowRight');
    await openEvent(page, 'Hola');
    await expect(composerOf(page)).toContainText('{{saludo}}');
    await page.getByRole('button', { exact: true, name: 'Send' }).click();
    await page.locator('[data-part="activity-row"][data-direction="in"]').last().click();
}

test('a connection with no environment of a migrated origin opens and sends what it did before', async () => {
    const sandbox = await makeSandbox();
    const echo = await startEchoServer();
    let app: ElectronApplication | undefined;

    try {
        await writeOldOrigin(sandbox.repoRoot, new URL(echo.url).host);

        const launched = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);
        const { page } = launched;

        app = launched.app;
        await connectAndSend(page);
        await expect(page.locator('[data-part="activity-detail"]')).toContainText('del workspace');
        expect(await readFile(join(sandbox.repoRoot, 'mandor.yaml'), 'utf8')).toContain(
            'formatVersion: 2',
        );
    } finally {
        await app?.close();
        await echo.close();
        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
