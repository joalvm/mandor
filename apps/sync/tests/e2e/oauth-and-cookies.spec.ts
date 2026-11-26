import { mkdir, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { itemText, localRepo, PERSONAL } from './support/disk-names.js';
import {
    aim,
    createEnvironment,
    createRequest,
    launchSync,
    responseOf,
    saveRequest,
} from './support/send-flow.js';
import { startLocalHttpServer, type LocalHttpServer } from './support/local-http-server.js';

test.describe.configure({ mode: 'serial' });

let root = '';
let app: ElectronApplication;
let page: Page;
let server: LocalHttpServer;

const ITEM_NAMES = ['pedidos', 'crear pedido'];

test.beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-sync-oauth-'));
    server = await startLocalHttpServer();
    await mkdir(join(root, 'origins'), { recursive: true });
    app = await launchSync(root);
    page = await app.firstWindow();

    await expect(page.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();
    await setWorkspaceClientCredentials();
    await createEnvironment(page, server.origin);
    await createRequest(page);
});

test.afterAll(async () => {
    await app.close();
    await server.close();
    await rm(root, { force: true, maxRetries: 10, recursive: true });
});

/** Real keystrokes: a value set by script does not always reach the state of the form. */
async function type(name: string, value: string): Promise<void> {
    const field = page.getByRole('textbox', { name }).last();

    await field.click();
    // A template arrives as one insertion: the field closes `{{}}` on its own while typing.
    await page.keyboard.insertText(value);
    await expect(field).toHaveText(value);
}

/** The auth of the workspace: a token asked of the local server with the client's credentials. */
async function setWorkspaceClientCredentials(): Promise<void> {
    await page.getByRole('button', { name: 'Personal', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Manage workspaces' }).click();
    await page.getByRole('button', { name: 'Authentication' }).click();

    const dialog = page.getByRole('dialog', { name: 'Authentication' });

    await dialog.getByRole('combobox', { name: 'Type' }).click();
    await page.getByRole('option', { name: 'OAuth2 client credentials' }).click();
    await type('Token URL', '{{baseUrl}}/token');
    await type('Client ID', 'mandor-e2e');
    await type('Client secret', 'e2e-client-secret');

    await dialog.getByRole('button', { exact: true, name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);
}

/** Aims the request at a path of the server, and waits for the file of the request to say so. */
async function aimAt(path: string): Promise<void> {
    await aim(page, 'GET', path);
    await expect(page.getByRole('textbox', { name: 'URL' })).toHaveText(`{{baseUrl}}${path}`);
    await saveRequest(page);
    await expect
        .poll(async () => (await itemText(localRepo(root), PERSONAL, ITEM_NAMES)).includes(path), {
            timeout: 10_000,
        })
        .toBe(true);
}

/** The body of the answer on screen, laid out on one line. */
async function answerBody(): Promise<string> {
    const lines = responseOf(page).locator('[data-part="code-editor"] .view-lines');

    return (await lines.innerText()).replace(/\s+/gu, ' ');
}

/**
 * Sends the request to a path. The panel keeps the answer of the send before until the new one
 * lands, so what a test reads off it is polled for, never read once.
 */
async function sendTo(path: string): Promise<void> {
    await aimAt(path);
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(responseOf(page).locator('[data-part="response-status"]')).toHaveText('200');
}

async function openJar(): Promise<ReturnType<Page['getByRole']>> {
    await page.getByRole('button', { exact: true, name: 'Cookies' }).click();

    const dialog = page.getByRole('dialog', { name: 'Cookies' });

    await expect(dialog).toBeVisible();

    return dialog;
}

test('a request that inherits asks the server for a token and sends it as a bearer', async () => {
    await sendTo('/whoami');

    await expect.poll(() => server.authorizations).toEqual(['Bearer tok-1']);
    expect(server.tokenRequests()).toBe(1);
});

test('the next send reuses the token while it is valid', async () => {
    await sendTo('/whoami');

    await expect.poll(() => server.authorizations).toEqual(['Bearer tok-1', 'Bearer tok-1']);
    expect(server.tokenRequests()).toBe(1);
});

test('no token is ever written to disk in plain text', async () => {
    const entries = await readdir(join(root, 'origins'), { recursive: true });
    const files = entries.filter((entry) => /\.mandor[\\/]tokens[\\/][^\\/]+\.json$/.test(entry));

    // Where the system has no keychain the token stays in memory and there is no file to read.
    for (const file of files) {
        const contents = await readFile(join(root, 'origins', file), 'utf8');

        expect(contents).not.toContain('tok-1');
    }
});

test('a login sets a cookie, and the hop it redirects to carries it back', async () => {
    await sendTo('/login');

    await expect.poll(answerBody).toContain('"cookie": "sid=e2e-session"');

    await responseOf(page).locator('[data-part="response-network"]').hover();
    await expect(page.locator('[data-part="redirect-hop"]')).toHaveCount(1);
});

test('the jar of the environment lists that cookie', async () => {
    const dialog = await openJar();

    await dialog.getByRole('button', { exact: true, name: 'sid' }).click();
    await expect(dialog.getByRole('textbox', { name: /^Cookie of /u })).toHaveValue(
        /^sid=e2e-session; /u,
    );
    await dialog.getByRole('button', { exact: true, name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);
});

test('emptying the jar sends the next request with no cookie', async () => {
    const dialog = await openJar();

    await dialog.getByRole('button', { name: 'Clear all…' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Clear all' }).click();
    await expect(dialog.getByText('No cookies')).toBeVisible();
    await dialog.getByRole('button', { exact: true, name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);

    await sendTo('/me');

    await expect.poll(answerBody).toContain('"cookie": null');
});
