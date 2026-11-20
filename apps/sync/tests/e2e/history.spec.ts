import { mkdir, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import { startLocalHttpServer, type LocalHttpServer } from './support/local-http-server.js';
import {
    aim,
    createEnvironment,
    createRequest,
    launchSync,
    responseOf,
} from './support/send-flow.js';
import { openSection } from '../../../../packages/ui/tests/support/open-section.js';

test.describe.configure({ mode: 'serial' });

let root = '';
let app: ElectronApplication;
let page: Page;
let server: LocalHttpServer;

test.beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-sync-history-'));
    server = await startLocalHttpServer();
    await mkdir(join(root, 'origins'), { recursive: true });
    app = await launchSync(root);
    page = await app.firstWindow();

    await expect(page.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();
});

test.afterAll(async () => {
    await app.close().catch(() => undefined);
    await server.close();
    await rm(root, { force: true, maxRetries: 10, recursive: true });
});

async function sendOnce(): Promise<void> {
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(responseOf(page).locator('[data-part="response-status"]')).toHaveText('200');
}

/** The files the history of the run has on disk, wherever the repo is. */
async function historyFiles(): Promise<string[]> {
    const entries = await readdir(join(root, 'origins'), { recursive: true });

    return entries.filter((entry) => /\.mandor[\\/]history[\\/].+\.json$/.test(entry));
}

async function openHistory(): Promise<void> {
    await page.keyboard.press('ControlOrMeta+Shift+P');
    await page.getByRole('textbox', { name: 'Search commands' }).fill('history');
    await page.getByRole('option', { name: /Open history/ }).click();
}

test('two sends of the same request are still in the history after the app is closed and opened again', async () => {
    await createEnvironment(page, server.origin);
    await createRequest(page);

    await openSection(page, 'Body');
    await page.getByRole('combobox', { name: 'Body type' }).click();
    await page.getByRole('option', { name: 'JSON' }).click();
    await editorLines(page, 'code-editor').click();
    await page.keyboard.insertText('{"at":"{{$uuid}}"}');
    await aim(page, 'POST', '/echo');
    await sendOnce();
    await sendOnce();
    await expect.poll(async () => (await historyFiles()).length).toBe(2);

    await app.close();
    app = await launchSync(root);
    page = await app.firstWindow();
    await expect(page.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();

    await openHistory();

    await expect(page.getByRole('heading', { name: 'History', level: 1 })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /to compare/ })).toHaveCount(2);
});

test('comparing the two sends shows the line that moved, once added and once removed', async () => {
    const [first, second] = await page.getByRole('checkbox', { name: /to compare/ }).all();

    await first?.click();
    await second?.click();
    await page.getByRole('button', { name: 'Compare' }).click();

    await expect(page.getByRole('heading', { name: 'Comparison', level: 1 })).toBeVisible();

    // The body goes in the diff editor of the app: the earlier send on the left, marked as gone.
    const body = page.getByRole('group', { name: 'Body' });

    await expect(body.locator('.line-delete').first()).toBeVisible();
    await expect(body.locator('.line-insert').first()).toBeVisible();
});

test('the history on disk holds one file per send, each with the answer', async () => {
    const files = await historyFiles();

    expect(files).toHaveLength(2);

    for (const file of files) {
        const text = await readFile(join(root, 'origins', file), 'utf8');

        expect(text).toContain('"kind": "response"');
    }
});
