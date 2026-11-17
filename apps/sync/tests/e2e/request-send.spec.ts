import { mkdir, mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import {
    aim,
    createEnvironment,
    createRequest,
    launchSync,
    responseOf,
} from './support/send-flow.js';
import { startLocalHttpServer, type LocalHttpServer } from './support/local-http-server.js';
import { openSection } from './support/open-section.js';

test.describe.configure({ mode: 'serial' });

let root = '';
let app: ElectronApplication;
let page: Page;
let server: LocalHttpServer;

test.beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-sync-send-'));
    server = await startLocalHttpServer();
    await mkdir(join(root, 'origins'), { recursive: true });
    app = await launchSync(root);
    page = await app.firstWindow();

    await expect(page.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();
    await createEnvironment(page, server.origin);
    await createRequest(page);
});

test.afterAll(async () => {
    await app.close();
    await server.close();
    await rm(root, { force: true, maxRetries: 10, recursive: true });
});

async function send(method: string, path: string): Promise<void> {
    await aim(page, method, path);
    await page.getByRole('button', { name: 'Send' }).click();
}

/** The files under the bodies directory of the repo of the run, wherever the repo is. */
async function spilledBodies(): Promise<string[]> {
    const entries = await readdir(join(root, 'origins'), { recursive: true });

    return entries.filter((entry) => /\.mandor[\\/]bodies[\\/][a-f0-9]{64}$/.test(entry));
}

test('a POST to the echo comes back as 200 with its body laid out, its headers and its times', async () => {
    await openSection(page, 'Body');
    await page.getByRole('combobox', { name: 'Body type' }).click();
    await page.getByRole('option', { name: 'JSON' }).click();
    await editorLines(page, 'code-editor').click();
    await page.keyboard.insertText('{"total":42}');
    await send('POST', '/echo');

    const response = responseOf(page);

    await expect(response.locator('[data-part="response-status"]')).toHaveText('200');
    await expect(response.locator('[data-part="code-editor"] .view-lines')).toContainText(
        '"method"',
    );
    await expect(response.locator('[data-part="code-editor"] .view-lines')).toContainText('total');

    await openSection(response, 'Headers');
    await expect(response.getByRole('row', { name: /x-echo/i })).toContainText('POST');

    await openSection(response, 'Cookies');
    await expect(response.getByRole('row', { name: /sid/ })).toContainText('HttpOnly');

    await response.locator('[data-part="response-time"]').hover();
    // "10 ms" is a time too: only a lone zero means nothing was measured.
    await expect(page.locator('[data-part="timing-row"]').last()).not.toHaveText(/\D0 ms$/u);
});

test('an HTML answer can be previewed in a frame under the production policy', async () => {
    await send('GET', '/page');

    const response = responseOf(page);

    await expect(response.locator('[data-part="response-status"]')).toHaveText('200');
    await openSection(response, 'Body');
    await response.getByRole('button', { name: 'Preview' }).click();

    const frame = page.frameLocator('iframe[data-part="response-page"]');

    await expect(frame.locator('#greeting')).toHaveText('hola desde el servidor');
});

test('a body bigger than memory is spilled to disk and still read from there', async () => {
    await send('GET', '/big');

    const response = responseOf(page);

    await expect(response.locator('[data-part="response-status"]')).toHaveText('200');
    await expect.poll(async () => (await spilledBodies()).length).toBe(1);

    const [file] = await spilledBodies();

    expect((await stat(join(root, 'origins', file ?? ''))).size).toBe(3 * 1024 * 1024);

    // One line of three megabytes fills the view long before its first window ends: nothing
    // more is read until the reader scrolls there or asks. Read on its own, it went on window
    // after window, each one decoding and comparing all of the text again, to the last byte.
    await expect(response.getByText('262.1 kB of 3.1 MB')).toBeVisible();
    await response.getByRole('button', { name: 'Load more' }).click();
    await expect(response.getByText('524.3 kB of 3.1 MB')).toBeVisible();
    await expect(response.getByRole('button', { name: 'Load more' })).toBeVisible();
});

test('a slow send is aborted from the same button and the panel says so', async () => {
    await send('GET', '/slow');
    await page.getByRole('button', { name: 'Abort' }).click();

    // A send nobody answered paints its own word beside the request, not a response summary.
    await expect(
        page.getByText('The request was cancelled before it finished.').first(),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();
});

test('a redirect shows its hop in the network of the summary', async () => {
    await send('GET', '/redirect');

    const response = responseOf(page);

    await expect(response.locator('[data-part="response-status"]')).toHaveText('200');
    await response.locator('[data-part="response-network"]').hover();
    await expect(page.locator('[data-part="redirect-hop"]')).toHaveCount(1);
    await expect(page.locator('[data-part="redirect-hop"]')).toContainText('302 →');
});
