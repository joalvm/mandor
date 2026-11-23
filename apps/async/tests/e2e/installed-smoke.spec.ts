import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { diskTree, entityNamed, onDisk } from '../../../../tools/workspace/disk-by-name.mjs';
import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import {
    startEchoServer,
    type EchoServer,
} from '../../../../packages/transport-async/tests/support/echo-server.js';
import { BEFORE, consolePanel, inConsole, scriptRows } from './support/attack-flow.js';
import { createConnection, defaultWorkspaceDir, expectFirstRun } from './support/first-run.js';
import {
    executableIn,
    install,
    installerIn,
    openInstalled,
    type Installed,
    type OpenApp,
} from './support/installed-app.js';

const INSTALLER = process.env['MANDOR_ASYNC_INSTALLER'] ?? '';
const PAIR = process.env['MANDOR_UPDATE_PAIR'] ?? '';
const CONNECTION = 'Instalada';
const SCRIPT = 'mandor.request.headers.set("X-Script", "ran"); console.log("desde el asar");';

// One installed app runs through both tests: the second starts where the first one left.
test.describe.configure({ mode: 'serial' });
// skip-policy: it installs a build, and only the job that builds an installer has one: update-e2e.
test.skip(INSTALLER === '' && PAIR === '', 'there is no installer to install');

let sandbox: string;
let repoRoot: string;
let echo: EchoServer;
let installed: Installed | undefined;
let app: OpenApp | undefined;
let page: Page;

async function removeSandbox(path: string): Promise<boolean> {
    try {
        await rm(path, { force: true, maxRetries: 10, recursive: true });

        return true;
    } catch {
        return false;
    }
}

/** The text of the connection on disk, found by the name the screen shows. */
async function connectionText(): Promise<string> {
    const workspace = await defaultWorkspaceDir(repoRoot);
    const file = onDisk(
        await entityNamed(diskTree(repoRoot), `${workspace}/connections`, CONNECTION),
        'the file of the connection',
    );

    return readFile(join(repoRoot, file), 'utf8').catch(() => '');
}

/**
 * The service of scripts came out of the asar too: its thread runs, and the editor offers the
 * names of the moment. What it typed goes away again, and the text is empty as it was.
 */
async function expectTheServiceOfScripts(): Promise<void> {
    await expect
        .poll(() => page.workers().some((worker) => worker.url().includes('script-worker-main')))
        .toBe(true);
    await page.keyboard.type('mandor.');
    await expect(
        page
            .locator('.suggest-widget')
            .filter({ visible: true })
            .getByText('request', { exact: true }),
    ).toHaveCount(1);
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
}

/**
 * Types the script before connecting into the settings of the connection. A key typed in an
 * empty text is the person writing it, so main approves it through the scripts of the bridge.
 */
async function writeBeforeScript(source: string): Promise<void> {
    await page
        .getByRole('option', { name: new RegExp(CONNECTION) })
        .getByRole('button', { name: 'Connection actions' })
        .click();
    await page.getByRole('menuitem', { exact: true, name: 'Settings' }).click();

    const dialog = page.getByRole('dialog');

    await dialog.getByRole('option', { name: 'Scripts' }).click();
    await dialog.getByRole('tab', { exact: true, name: BEFORE }).click();
    await editorLines(dialog, 'event-script').filter({ visible: true }).first().click();
    await expectTheServiceOfScripts();
    await page.keyboard.insertText(source);
    await expect.poll(connectionText).toContain(source);
    await dialog.getByRole('button', { exact: true, name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);
}

test.beforeAll(async () => {
    sandbox = await mkdtemp(join(tmpdir(), 'mandor-async-installed-'));
    echo = await startEchoServer();

    // The work goes to the sandbox and not to the documents folder of the machine running this.
    const container = join(sandbox, 'repo');

    repoRoot = join(container, 'async', 'local');

    const installer = INSTALLER === '' ? await installerIn(join(PAIR, 'from')) : INSTALLER;

    installed = await install(installer, sandbox);
    app = await openInstalled(await executableIn(installed.directory), join(sandbox, 'data'), {
        MANDOR_DEFAULT_REPO_ROOT: container,
    });
    page = app.page;
    await expectFirstRun(page);
});

// A start that failed leaves nothing to close: the next try installs in a sandbox of its own.
test.afterAll(async () => {
    await app?.close();
    await echo.close();
    await installed?.uninstall();
    await expect.poll(() => removeSandbox(sandbox)).toBe(true);
});

test('an onBeforeConnect script runs in the worker the package loads', async () => {
    await createConnection(page, CONNECTION, echo.url, repoRoot);
    await writeBeforeScript(SCRIPT);
    await page.getByRole('button', { exact: true, name: 'Connect' }).click();
    await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toBeVisible();

    // The worker and the WASM of QuickJS came out of the asar: the header it set travelled and
    // its line is counted in the activity of the connection.
    await expect.poll(() => echo.clientCount()).toBe(1);
    expect(echo.lastHeaders()['x-script']).toBe('ran');
    await expect(scriptRows(page).filter({ hasText: BEFORE }).first()).toContainText(/lines?/u);
    await inConsole(page, async () => {
        await expect(consolePanel(page).getByText('desde el asar')).toBeVisible();
    });
    await page.getByRole('button', { exact: true, name: 'Disconnect' }).click();
    await expect(page.getByRole('button', { exact: true, name: 'Connect' })).toBeVisible();
});

test('opens the installed app on its screen of workspaces', async () => {
    // The way into the workspaces is the workspace menu of the title row, so the screen is
    // reached the way a user reaches it. The row opens the menu of the origins first and the
    // one of the workspaces second.
    await page.locator('[data-part="titlebar"] [aria-haspopup="menu"]').nth(1).click();
    await page.getByRole('menuitem', { name: 'Manage workspaces' }).click();

    await expect(page.getByRole('heading', { name: 'Workspaces' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New workspace' })).toBeVisible();
});
