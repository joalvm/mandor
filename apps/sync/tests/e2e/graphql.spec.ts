import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import { itemText, localRepo, PERSONAL } from './support/disk-names.js';
import { startLocalHttpServer, type LocalHttpServer } from './support/local-http-server.js';
import {
    aim,
    createEnvironment,
    createRequest,
    launchSync,
    responseOf,
    saveRequest,
} from './support/send-flow.js';
import { openSection } from './support/open-section.js';

test.describe.configure({ mode: 'serial' });

let root = '';
let app: ElectronApplication;
let page: Page;
let server: LocalHttpServer;

test.beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-sync-graphql-'));
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

/** What the server was asked for its schema: the questions that name `__schema`. */
function introspections(): number {
    return server.graphqlQueries.filter((query) => query.includes('__schema')).length;
}

/** Replaces what the editor of the query holds; what the editor closed on its own after it goes. */
async function writeQuery(text: string): Promise<void> {
    await editorLines(page, 'graphql-body').first().click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.keyboard.insertText(text);
    await page.keyboard.press('ControlOrMeta+Shift+End');
    await page.keyboard.press('Delete');
}

/** The query is on disk once the request is saved: closing before then loses it. */
async function expectQueryOnDisk(): Promise<void> {
    await page.getByRole('tab', { name: 'crear pedido' }).click();
    await saveRequest(page);

    await expect
        .poll(() => itemText(localRepo(root), PERSONAL, ['pedidos', 'crear pedido']), {
            timeout: 15_000,
        })
        .toContain('user(id: "2")');
    // The history goes back in front: the window opens again with the tab it closed with.
    await page.getByRole('tab', { name: 'History' }).click();
}

async function openBody(): Promise<void> {
    await openSection(page, 'Body');
}

test('the schema fetched by hand is offered as suggestions while the query is written', async () => {
    await createEnvironment(page, server.origin);
    await createRequest(page);
    await openBody();
    await page.getByRole('combobox', { name: 'Body type' }).click();
    await page.getByRole('option', { name: 'GraphQL' }).click();
    await aim(page, 'POST', '/graphql');

    await expect(page.getByText('No schema')).toBeVisible();
    expect(introspections()).toBe(0);

    await page.getByRole('button', { name: 'Fetch schema' }).click();

    await expect(page.getByText(/^Schema from/)).toBeVisible();
    expect(introspections()).toBe(1);

    await writeQuery('{ us');
    await page.keyboard.press('ControlOrMeta+Space');

    await expect(page.locator('.suggest-widget')).toContainText('user');
    await page.keyboard.press('Escape');
});

test('a document with two operations sends the one that was picked, with its variables', async () => {
    await writeQuery(
        'query GetUser($id: ID!) { user(id: $id) { name } } query Other { user(id: "9") { id } }',
    );
    await page.getByRole('combobox', { name: 'Operation' }).click();
    await page.getByRole('option', { name: 'GetUser' }).click();
    await editorLines(page, 'graphql-body').last().click();
    await page.keyboard.insertText('{"id": "1"}');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(responseOf(page).locator('[data-part="response-status"]')).toHaveText('200');
    await expect(responseOf(page).locator('[data-part="response-body"]')).toContainText('user 1');
});

test('an answer of 200 that carries an error is marked as one, in the answer and in the history', async () => {
    await writeQuery('{ user(id: "2") { name } }');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(responseOf(page).getByText('GraphQL errors: 1')).toBeVisible();

    await page.keyboard.press('ControlOrMeta+Shift+P');
    await page.getByRole('textbox', { name: 'Search commands' }).fill('history');
    await page.getByRole('option', { name: /Open history/ }).click();

    await expect(page.locator('[data-part="history-outcome"][data-fault="true"]')).toHaveCount(1);
});

test('the schema is still there after the app is closed and opened again, with no new question', async () => {
    const before = server.graphqlQueries.length;

    await expectQueryOnDisk();
    await app.close();
    app = await launchSync(root);
    page = await app.firstWindow();
    await expect(page.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();

    await expect(page.getByRole('heading', { name: 'History', level: 1 })).toBeVisible();
    await page.getByRole('tab', { name: 'crear pedido' }).click();
    await openBody();

    await expect(page.getByText(/^Schema from/)).toBeVisible();
    expect(introspections()).toBe(1);
    expect(server.graphqlQueries).toHaveLength(before);
});
