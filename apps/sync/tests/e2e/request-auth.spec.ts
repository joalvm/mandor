import { mkdir, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import {
    definitionText,
    itemText,
    localRepo,
    PERSONAL,
    workspaceText,
} from './support/disk-names.js';
import {
    aim,
    createEnvironment,
    createRequest,
    launchSync,
    responseOf,
    saveRequest,
} from './support/send-flow.js';
import { startLocalHttpServer, type LocalHttpServer } from './support/local-http-server.js';
import { openSection } from './support/open-section.js';

test.describe.configure({ mode: 'serial' });

let root = '';
let app: ElectronApplication;
let page: Page;
let server: LocalHttpServer;

const ITEM_NAMES = ['pedidos', 'crear pedido'];

test.beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-sync-auth-'));
    server = await startLocalHttpServer();
    await mkdir(join(root, 'origins'), { recursive: true });
    app = await launchSync(root);
    page = await app.firstWindow();

    await expect(page.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();
    await setWorkspaceBearer();
    await expectWorkspaceOnDisk();
    await createEnvironment(page, server.origin);
    await createRequest(page);
});

test.afterAll(async () => {
    await app.close();
    await server.close();
    await rm(root, { force: true, maxRetries: 10, recursive: true });
});

/** Waits until the file a lookup finds exists and its contents satisfy the check, watchers settled. */
async function expectFile(
    read: () => Promise<string>,
    check: (contents: string) => void,
): Promise<void> {
    await expect
        .poll(
            async () => {
                try {
                    check(await read());

                    return true;
                } catch {
                    return false;
                }
            },
            { timeout: 10_000 },
        )
        .toBe(true);
}

/** The auth of the workspace is on disk before anything else writes near it. */
async function expectWorkspaceOnDisk(): Promise<void> {
    await expectFile(
        () => workspaceText(localRepo(root), PERSONAL),
        (contents) => {
            expect(contents).toContain('type: bearer');
        },
    );
}

/** Real keystrokes: a value set by script does not always reach the state of the form. */
async function type(page: Page, name: string, value: string): Promise<void> {
    const field = page.getByRole('textbox', { name }).last();

    await field.click();
    await field.pressSequentially(value);
    await expect(field).toHaveText(value);
}

/**
 * The auth of the workspace, from the management tab the workspace menu opens. The token is a
 * literal: only what is marked secret in a variable is hidden, and the history test below reads
 * exactly that.
 */
async function setWorkspaceBearer(): Promise<void> {
    await page.getByRole('button', { name: 'Personal', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Manage workspaces' }).click();
    await page.getByRole('button', { name: 'Authentication' }).click();

    const dialog = page.getByRole('dialog', { name: 'Authentication' });

    await dialog.getByRole('combobox', { name: 'Type' }).click();
    await page.getByRole('option', { name: 'Bearer' }).click();

    // The template arrives as one insertion: the field closes `{{}}` on its own while typing.
    const token = page.getByRole('textbox', { name: 'Token' });

    await token.click();
    await page.keyboard.insertText('s3cret-value');
    await expect(token).toHaveText('s3cret-value');

    await dialog.getByRole('button', { exact: true, name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);
}

/** The scheme the response panel names — `Bearer`, `Basic` — null, or undefined while it names none. */
async function schemeOnPanel(): Promise<string | null | undefined> {
    const lines = responseOf(page).locator('[data-part="code-editor"] .view-lines');
    const body = (await lines.allInnerTexts()).join(' ').replace(/\s+/gu, ' ');
    const raw = /"scheme":\s*("[^"]*"|null)/.exec(body)?.[1];

    return raw === undefined ? undefined : (JSON.parse(raw) as string | null);
}

/**
 * Sends the request and waits until the panel says which scheme the server saw. The status of
 * the answer before this one is still on the panel while the send is in flight, so the status
 * alone proves nothing: the scheme is polled until it is the one this send must have produced.
 */
async function sendWhoami(expected: string | null): Promise<void> {
    await aim(page, 'GET', '/whoami');

    // The url is saved to disk before the send: a reload that reads an older file would take
    // what is on screen off the panel, and the send would go out with an empty url.
    const url = page.getByRole('textbox', { name: 'URL' });

    await expect(url).toHaveText('{{baseUrl}}/whoami');
    await saveRequest(page);
    await expectFile(
        () => itemText(localRepo(root), PERSONAL, ITEM_NAMES),
        (contents) => {
            expect(contents).toContain('whoami');
        },
    );

    await page.getByRole('button', { name: 'Send' }).click();

    const response = responseOf(page);

    await expect(response.locator('[data-part="response-status"]')).toHaveText('200');

    await expect.poll(schemeOnPanel).toBe(expected);
}

test('a request that inherits dials the bearer the workspace carries', async () => {
    await sendWhoami('Bearer');
});

test('a folder above the request decides before the workspace, until the request says none', async () => {
    await openSection(page, 'Auth');

    // The auth of a collection opens in its own tab, from a line of the menu of its row in the tree.
    await page
        .getByRole('treeitem', { name: 'pedidos' })
        .getByRole('button', { name: 'Row options' })
        .click();
    await page.getByRole('menuitem', { name: 'Authorization…' }).click();

    const auth = page.locator('[data-part="folder-auth"]');

    await auth.getByRole('combobox', { name: 'Type' }).click();
    await page.getByRole('option', { name: 'Basic' }).click();
    await type(page, 'Username', 'ana');
    await type(page, 'Password', 's3cret-basic');

    // The folder is read from disk at send time: the send waits for what the tab saved.
    // The first level is a collection: the auth of the level lives in its own file.
    await expectFile(
        () => definitionText(localRepo(root), PERSONAL, ['pedidos']),
        (contents) => {
            expect(contents).toContain('type: basic');
        },
    );

    // The level the request inherits from is read again once the last write of the tab landed.
    await page.getByRole('tab', { name: 'crear pedido' }).click();
    await expect(page.getByText('Uses Basic from pedidos.')).toBeVisible();

    await sendWhoami('Basic');

    await page.getByRole('combobox', { name: 'Type' }).click();
    await page.getByRole('option', { name: 'No auth' }).click();

    await sendWhoami(null);
});

test('the history keeps the credential typed by hand as it was sent', async () => {
    const entries = await readdir(join(root, 'origins'), { recursive: true });
    const files = entries.filter((entry) => /\.mandor[\\/]history[\\/].+\.json$/.test(entry));
    const contents = await Promise.all(
        files.map((file) => readFile(join(root, 'origins', file), 'utf8')),
    );

    expect(contents.join('\n')).toContain('Bearer s3cret-value');
});
