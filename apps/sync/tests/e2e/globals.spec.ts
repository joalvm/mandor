import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { localRepo } from './support/disk-names.js';
import { pickerOf } from './support/import-flow.js';
import { startLocalHttpServer, type LocalHttpServer } from './support/local-http-server.js';
import { createEnvironment, createRequest, launchSync } from './support/send-flow.js';
import { writeRowAt } from './support/variable-row.js';

/**
 * No secret global takes part here on purpose: declaring one asks the keychain of the system to
 * keep the value, and the container has none. That a secret global leaves hidden at every border
 * is proven where `readSecret` is a dependency (`global-secret-redaction.test.ts`).
 */

let server: LocalHttpServer;

test.beforeAll(async () => {
    server = await startLocalHttpServer();
});

test.afterAll(async () => {
    await server.close();
});

/** Sends the request on screen and answers the query the echo saw. */
async function sentQuery(page: Page): Promise<URLSearchParams> {
    const before = server.echoes.length;

    await page.getByRole('button', { name: 'Send' }).click();
    await expect.poll(() => server.echoes.length).toBe(before + 1);

    return new URL(server.echoes.at(-1)?.url ?? '/', 'http://echo').searchParams;
}

async function aimAt(page: Page, url: string): Promise<void> {
    const field = page.getByRole('textbox', { name: 'URL' });

    await field.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.insertText(url);
}

async function openDialog(page: Page) {
    await pickerOf(page).click();
    await page.getByRole('menuitem', { name: 'Manage environments' }).click();

    return page.getByRole('dialog', { name: 'Environments' });
}

/** A global, sent; then the same name in the environment, which takes over. */
async function writeGlobalThenOverride(page: Page, root: string): Promise<void> {
    const dialog = await openDialog(page);

    await dialog.getByRole('option', { name: 'Globals' }).click();
    await writeRowAt(
        dialog.getByRole('textbox', { exact: true, name: 'Key' }).nth(0),
        dialog.getByRole('textbox', { exact: true, name: 'Value' }).nth(0),
        'saludo',
        'global',
    );
    await expect
        .poll(() => readFile(join(localRepo(root), 'globals.yaml'), 'utf8').catch(() => ''))
        .toContain('value: global');
    await dialog.getByRole('button', { exact: true, name: 'Close' }).click();

    await aimAt(page, '{{baseUrl}}/echo?s={{saludo}}');
    expect((await sentQuery(page)).get('s')).toBe('global');

    const again = await openDialog(page);

    await again.getByRole('option', { name: 'Local' }).click();
    await writeRowAt(
        again.getByRole('textbox', { exact: true, name: 'Key' }).nth(1),
        again.getByRole('textbox', { exact: true, name: 'Value' }).nth(1),
        'saludo',
        'entorno',
    );
    await expect
        .poll(() => readFile(join(localRepo(root), 'globals.yaml'), 'utf8'))
        .toContain('value: global');
    await again.getByRole('button', { exact: true, name: 'Close' }).click();
}

test('a global of the origin resolves in a send, and the active environment overrides it', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mandor-sync-globals-'));
    let app: ElectronApplication | undefined;

    try {
        await mkdir(join(root, 'origins'), { recursive: true });
        app = await launchSync(root);

        const page = await app.firstWindow();

        await expect(page.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();
        await createRequest(page);
        await createEnvironment(page, server.origin);

        await writeGlobalThenOverride(page, root);
        await expect.poll(async () => (await sentQuery(page)).get('s')).toBe('entorno');
    } finally {
        await app?.close();
        await rm(root, { force: true, maxRetries: 10, recursive: true });
    }
});

/** An origin a build before the globals saved: format 1, and variables in its workspace. */
async function writeOldOrigin(repo: string): Promise<void> {
    const variable = (name: string, value: string): string =>
        `  - name: ${name}\n    value: "${value}"\n    enabled: true\n    secret: false\n`;
    const files: Record<string, string> = {
        'mandor.yaml': 'formatVersion: 1\nname: Local\nworkspaces:\n  - personal\n',
        'workspaces/personal/workspace.yaml': `id: personal\nname: Personal\nkind: sync\nvariables:\n${variable('baseUrl', server.origin)}${variable('level', 'ws')}`,
        'workspaces/personal/environments/prod.yaml': `id: prod\nname: Prod\nvariables:\n${variable('level', 'prod')}`,
        'workspaces/personal/collections/collections.yaml': 'order:\n  - api\n',
        'workspaces/personal/collections/api/collection.yaml': 'name: API\norder:\n  - pedir\n',
        'workspaces/personal/collections/api/pedir.yaml':
            'kind: request\nname: Pedir\nmethod: GET\nurl: "{{baseUrl}}/echo?level={{level}}"\n',
    };

    for (const [path, text] of Object.entries(files)) {
        await mkdir(join(repo, path, '..'), { recursive: true });
        await writeFile(join(repo, path), text, 'utf8');
    }
}

test('an origin with variables of the workspace migrates and every send stays as it was', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mandor-sync-migrate-'));
    let app: ElectronApplication | undefined;

    try {
        await writeOldOrigin(localRepo(root));
        app = await launchSync(root);

        const page = await app.firstWindow();

        await page.getByRole('treeitem', { name: 'API' }).click();
        await page.keyboard.press('ArrowRight');
        await page.getByRole('treeitem', { name: 'Pedir' }).click();

        // No environment chosen on this machine: Base, born with the variables, is the default.
        await expect(pickerOf(page)).toContainText('Base (default)');
        expect((await sentQuery(page)).get('level')).toBe('ws');

        await pickerOf(page).click();
        await page.getByRole('menuitem', { name: 'Prod' }).click();
        expect((await sentQuery(page)).get('level')).toBe('prod');

        expect(await readFile(join(localRepo(root), 'mandor.yaml'), 'utf8')).toContain(
            'formatVersion: 2',
        );
    } finally {
        await app?.close();
        await rm(root, { force: true, maxRetries: 10, recursive: true });
    }
});
