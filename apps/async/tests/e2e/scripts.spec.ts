import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Locator, type Page } from '@playwright/test';

import { diskTree, entityNamed, onDisk } from '../../../../tools/workspace/disk-by-name.mjs';
import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import {
    startEchoServer,
    type EchoServer,
} from '../../../../packages/transport-async/tests/support/echo-server.js';
import { createConnection, defaultWorkspaceDir, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox, type Sandbox } from './support/launch-app.js';

// One app and one connection run through every test: each one starts where the last one left.
test.describe.configure({ mode: 'serial' });

const CONNECTION = 'Guion';
const BEFORE = 'Before connecting';
const ON_CONNECT = 'On connect';
const ON_MESSAGE = 'On messages';
const BAND = 'It does not run until you approve it';
const FLOOD = 3000;

let sandbox: Sandbox;
let app: ElectronApplication;
let page: Page;
let echo: EchoServer;

function rowsOf(direction: 'in' | 'out', text: string) {
    return page
        .locator(`[data-part="activity-row"][data-direction="${direction}"]`)
        .filter({ hasText: text });
}

/** The lines of the scripts, the newest first: the timeline reads from the top down. */
function scriptRows() {
    return page.locator('[data-part="activity-script-row"]');
}

function consolePanel() {
    return page.locator('[data-part="console-panel"]');
}

/** Where the connection lives in the repo, by the name the screen shows. */
async function connectionFile(): Promise<string> {
    const tree = diskTree(sandbox.repoRoot);
    const workspace = await defaultWorkspaceDir(sandbox.repoRoot);
    const file = onDisk(
        await entityNamed(tree, `${workspace}/connections`, CONNECTION),
        'the file of the connection',
    );

    return join(sandbox.repoRoot, file);
}

async function onDiskText(): Promise<string> {
    return readFile(await connectionFile(), 'utf8').catch(() => '');
}

/** Opens the settings of the connection on the script of one moment. */
async function openScript(event: string) {
    await page
        .getByRole('option', { name: new RegExp(CONNECTION) })
        .getByRole('button', { name: 'Connection actions' })
        .click();
    await page.getByRole('menuitem', { exact: true, name: 'Settings' }).click();

    // The dialog takes the name of the section it shows: it is the only one open.
    const dialog = page.getByRole('dialog');

    await dialog.getByRole('option', { name: 'Scripts' }).click();
    await dialog.getByRole('tab', { exact: true, name: event }).click();

    return dialog;
}

async function closeSettings(dialog: Locator): Promise<void> {
    await dialog.getByRole('button', { exact: true, name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);
}

/** Writes the script of one moment from the settings of the connection, and waits for the disk. */
async function writeScript(event: string, source: string, gone = ''): Promise<void> {
    const dialog = await openScript(event);

    await editorLines(dialog, 'event-script').filter({ visible: true }).first().click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');

    if (source !== '') {
        await page.keyboard.insertText(source);
        await expect.poll(onDiskText).toContain(source);
    } else {
        await expect.poll(onDiskText).not.toContain(gone);
    }

    await closeSettings(dialog);
}

async function connect(): Promise<void> {
    await page.getByRole('button', { exact: true, name: 'Connect' }).click();
    await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toBeVisible();
}

async function disconnect(): Promise<void> {
    await page.getByRole('button', { exact: true, name: 'Disconnect' }).click();
    await expect(page.getByRole('button', { exact: true, name: 'Connect' })).toBeVisible();
}

/** Opens the console from the status bar, reads it, and puts it away again. */
async function inConsole(read: () => Promise<void>): Promise<void> {
    await page.getByRole('button', { name: 'Show the console' }).click();
    await read();
    await consolePanel().getByRole('button', { name: 'Hide the console' }).click();
    await expect(consolePanel()).toHaveCount(0);
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
    sandbox = await makeSandbox();
    echo = await startEchoServer();
    ({ app, page } = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot));
    await expectFirstRun(page);
    await createConnection(page, CONNECTION, echo.url, sandbox.repoRoot);
});

test.afterAll(async () => {
    await app.close();
    await echo.close();
    await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
});

test('a script on connect greets through the socket and writes to the console', async () => {
    await writeScript(ON_CONNECT, 'console.log("saludo dicho"); socket.send("hola");');
    await connect();

    await expect(rowsOf('out', 'hola')).toHaveCount(1);
    await expect(rowsOf('in', 'hola')).toHaveCount(1);
    await expect(scriptRows().filter({ hasText: ON_CONNECT }).first()).toContainText('1 line');
    await inConsole(async () => {
        await expect(consolePanel().getByText('saludo dicho')).toBeVisible();
    });
    await disconnect();
    await writeScript(ON_CONNECT, '', 'saludo dicho');
});

test('a script on messages answers what the server says', async () => {
    await writeScript(ON_MESSAGE, 'if (message.text === "ping") { socket.send("pong"); }');
    await connect();
    echo.broadcastText('ping');

    await expect(rowsOf('out', 'pong')).toHaveCount(1);
    await expect(rowsOf('in', 'pong')).toHaveCount(1);
});

test('a flood of messages does not freeze the window', async () => {
    for (let index = 0; index < FLOOD; index += 1) {
        echo.broadcastText(`ola ${String(index)}`);
    }

    // While the scripts work through the flood, the window still answers.
    await inConsole(async () => {
        await expect(consolePanel()).toBeVisible();
    });
    echo.broadcastText('fin');
    await expect(rowsOf('in', 'fin')).toHaveCount(1, { timeout: 20_000 });
    await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toBeVisible();
    await disconnect();
    await writeScript(ON_MESSAGE, '', 'pong');
});

test('a script that fails before connecting keeps the socket shut, and the fault opens it without', async () => {
    await writeScript(BEFORE, 'throw new Error("no se conecta");');
    await page.getByRole('button', { exact: true, name: 'Connect' }).click();
    await page.locator('[data-part="activity-fault-row"]').last().click();

    const detail = page.locator('[data-part="activity-detail"]');

    await expect(detail).toContainText('A script failed, so nothing went out');
    await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toHaveCount(0);

    await detail.getByRole('button', { exact: true, name: 'Connect without scripts' }).click();
    await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toBeVisible();
    await expect.poll(() => echo.clientCount()).toBe(1);
    await disconnect();
    await writeScript(BEFORE, '', 'no se conecta');
});

test('a script changed on disk waits for approval and does not run', async () => {
    await writeScript(ON_CONNECT, 'socket.send("marca uno");');

    const file = await connectionFile();

    await writeFile(file, (await readFile(file, 'utf8')).replace('marca uno', 'marca dos'), 'utf8');

    // The band alone proves nothing: it may still stand for the text before.
    const dialog = await openScript(ON_CONNECT);

    await expect(editorLines(dialog, 'event-script').filter({ visible: true })).toContainText(
        'marca dos',
    );
    await expect(dialog.getByText(BAND)).toBeVisible();
    await closeSettings(dialog);
    await connect();

    await expect(scriptRows().filter({ hasText: ON_CONNECT }).first()).toContainText(
        '1 not approved',
    );
    await expect(rowsOf('out', 'marca')).toHaveCount(0);
    await disconnect();
});

test('approved from its band, the script runs at the next connect', async () => {
    const dialog = await openScript(ON_CONNECT);

    await dialog.getByRole('button', { exact: true, name: 'Approve' }).click();
    await expect(dialog.getByText(BAND)).toHaveCount(0);
    await closeSettings(dialog);
    await connect();

    await expect(rowsOf('out', 'marca dos')).toHaveCount(1);
    await disconnect();
});

test('with scripts switched off, the greeting does not go and the note says so', async () => {
    // Whether the timeline keeps the last session or not, the greeting must not go once more.
    const sent = await rowsOf('out', 'marca dos').count();

    await switchScripts(false);
    await connect();

    await expect(scriptRows().filter({ hasText: ON_CONNECT }).first()).toContainText(
        '1 switched off',
    );
    await expect(rowsOf('out', 'marca dos')).toHaveCount(sent);
    await disconnect();
    await switchScripts(true);
});
