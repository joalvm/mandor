import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import { itemFile, localRepo, PERSONAL } from './support/disk-names.js';
import { startLocalHttpServer, type LocalHttpServer } from './support/local-http-server.js';
import { openSection } from '../../../../packages/ui/tests/support/open-section.js';
import {
    aim,
    createEnvironment,
    createRequest,
    launchSync,
    nameNewRequest,
    responseOf,
    saveRequest,
} from './support/send-flow.js';

// One app and one tree run through every test: each one starts where the last one left.
test.describe.configure({ mode: 'serial' });

const BEFORE = 'Before the request';
const AFTER = 'After the response';
const BAND = 'It does not run until you approve it';

let root = '';
let app: ElectronApplication;
let page: Page;
let server: LocalHttpServer;

/** Writes the script of one moment of the request on screen, over the one it had. */
async function writeScript(event: string, source: string): Promise<void> {
    await openSection(page, 'Scripts');
    await openSection(page, event);
    await editorLines(page, 'event-script').filter({ visible: true }).first().click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');

    if (source !== '') {
        await page.keyboard.insertText(source);
    }
}

/** Sends the request on screen and waits for the echo to see it. */
async function send(): Promise<void> {
    const before = server.echoes.length;

    await page.getByRole('button', { exact: true, name: 'Send' }).click();
    await expect.poll(() => server.echoes.length).toBe(before + 1);
}

function consolePanel() {
    return page.getByRole('region', { name: 'Console' });
}

/** Opens the console from the status bar, reads it, and puts it away again. */
async function inConsole(read: () => Promise<void>): Promise<void> {
    await page.getByRole('button', { name: 'Show the console' }).click();
    await read();
    await consolePanel().getByRole('button', { name: 'Hide the console' }).click();
    await expect(consolePanel()).toHaveCount(0);
}

/** Changes the file of the request the way a pull would: behind the back of the app. */
async function rewriteOnDisk(from: string, to: string): Promise<void> {
    const file = await itemFile(localRepo(root), PERSONAL, ['pedidos', 'crear pedido']);

    await expect.poll(async () => (await readFile(file, 'utf8')).includes(from)).toBe(true);
    await writeFile(file, (await readFile(file, 'utf8')).replace(from, to), 'utf8');
    // The band alone proves nothing: it may still stand for the text before.
    await expect(editorLines(page, 'event-script').filter({ visible: true })).toContainText(to);
}

async function switchScripts(on: boolean): Promise<void> {
    await page.getByRole('button', { exact: true, name: 'Settings' }).click();

    // The dialog takes the name of the section it shows: it is the only one open.
    const dialog = page.getByRole('dialog');

    await dialog.getByRole('option', { name: 'Scripts' }).click();

    const toggle = dialog.getByRole('switch', { name: 'Run scripts' });

    await toggle.click();
    await expect(toggle).toBeChecked({ checked: on });
    await dialog.getByRole('button', { exact: true, name: 'Close settings' }).click();
    await expect(dialog).toHaveCount(0);
}

test.beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-sync-scripts-'));
    server = await startLocalHttpServer();
    await mkdir(join(root, 'origins'), { recursive: true });
    app = await launchSync(root);
    page = await app.firstWindow();

    await expect(page.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();
    await createEnvironment(page, server.origin);
    await createRequest(page);
    await aim(page, 'GET', '/echo');
});

test.afterAll(async () => {
    await app.close();
    await server.close();
    await rm(root, { force: true, maxRetries: 10, recursive: true });
});

test('a script written here runs at the send, with no question, and writes to the console', async () => {
    await writeScript(BEFORE, 'console.log("hola desde el script");');

    await expect(page.getByText(BAND)).toHaveCount(0);

    await send();
    await inConsole(async () => {
        await expect(consolePanel().getByText('hola desde el script')).toBeVisible();
    });
});

test('a variable one request sets reaches the next one', async () => {
    await writeScript(AFTER, 'vars.set("pedido", "42");');
    await send();

    const folder = page.getByRole('treeitem', { name: 'pedidos' });

    await folder.getByRole('button', { name: 'Row options' }).click();
    await page.getByRole('menuitem', { name: 'New request' }).click();
    await nameNewRequest(page, 'ver pedido');
    await aim(page, 'GET', '/echo/{{pedido}}');
    await send();

    expect(server.echoes.at(-1)?.url).toBe('/echo/42');
});

test('an expect that does not hold shows as failed among the tests', async () => {
    await writeScript(AFTER, 'test("es 201", () => { expect(response.status).to.equal(201); });');
    await send();
    await openSection(responseOf(page), /^Tests/u);

    const tests = page.getByRole('list', { name: 'Tests of the scripts' });

    await expect(tests.getByText('es 201')).toBeVisible();
    await expect(tests.getByText(/^Failed/u)).toBeVisible();
});

test('a script that never ends does not freeze the window, and the request goes out without it', async () => {
    await writeScript(AFTER, '');
    await writeScript(BEFORE, 'while (true) {}');
    await page.getByRole('button', { exact: true, name: 'Send' }).click();

    // While the script spins, the window still answers.
    await inConsole(async () => {
        await expect(consolePanel()).toBeVisible();
    });
    await expect(page.locator('[data-part="send-status"]')).toContainText(
        'A script failed, so nothing went out',
        { timeout: 20_000 },
    );

    const before = server.echoes.length;

    await page.getByRole('button', { name: 'Send without scripts' }).click();
    await expect.poll(() => server.echoes.length).toBe(before + 1);
    await expect(responseOf(page).locator('[data-part="response-status"]')).toContainText('200');
    await writeScript(BEFORE, '');
});

test('a script brought on disk waits for approval, goes out without it, and runs once approved', async () => {
    await page.getByRole('treeitem', { name: 'crear pedido' }).click();
    await writeScript(BEFORE, 'console.log("marca uno");');
    await saveRequest(page);
    await rewriteOnDisk('marca uno', 'marca dos');
    await openSection(page, 'Scripts');
    await openSection(page, BEFORE);

    await expect(page.getByText(BAND)).toBeVisible();

    await send();
    await expect(page.getByText('Sent without 1 unapproved script')).toBeVisible();
    await page.getByRole('button', { exact: true, name: 'Review' }).click();

    const dialog = page.getByRole('dialog', { name: '1 script left out' });

    await dialog.getByRole('button', { exact: true, name: 'Approve' }).click();
    await expect(dialog.getByText('Approved: it runs from the next send')).toBeVisible();
    await dialog.getByRole('button', { exact: true, name: 'Close' }).click();
    await send();
    await inConsole(async () => {
        await expect(consolePanel().getByText('marca dos')).toBeVisible();
    });
});

test('a text changed on disk again asks again, and the band approves it', async () => {
    await rewriteOnDisk('marca dos', 'marca tres');

    await expect(page.getByText(BAND)).toBeVisible();

    await send();
    await expect(page.getByText('Sent without 1 unapproved script')).toBeVisible();
    await page.getByRole('button', { exact: true, name: 'Approve' }).click();
    await expect(page.getByText(BAND)).toHaveCount(0);
    await send();
    await inConsole(async () => {
        await expect(consolePanel().getByText('marca tres')).toHaveCount(1);
    });
});

test('switched off, no script runs and the console counts them; on again, they run unasked', async () => {
    await switchScripts(false);
    await send();
    await inConsole(async () => {
        // Each moment of the send counts its own: one before the request, one after the response.
        await expect(consolePanel().getByText('Scripts are off: 1 did not run')).toHaveCount(2);
        await expect(consolePanel().getByText('marca tres')).toHaveCount(1);
    });

    await switchScripts(true);
    await send();
    await expect(page.getByText(BAND)).toHaveCount(0);
    await inConsole(async () => {
        await expect(consolePanel().getByText('marca tres')).toHaveCount(2);
    });
});
