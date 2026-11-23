import { rm } from 'node:fs/promises';

import { expect, test, type ElectronApplication, type Locator, type Page } from '@playwright/test';

import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import { hoverWord } from '../../../../packages/ui/tests/support/hover-word.js';
import {
    startEchoServer,
    type EchoServer,
} from '../../../../packages/transport-async/tests/support/echo-server.js';
import { createConnection, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox, type Sandbox } from './support/launch-app.js';

// One app and one connection run through every test: each one starts where the last one left.
test.describe.configure({ mode: 'serial' });

const CONNECTION = 'Editor';
const BEFORE = 'Before connecting';

let sandbox: Sandbox;
let app: ElectronApplication;
let page: Page;
let echo: EchoServer;
let dialog: Locator;

function editorOfScript(): Locator {
    return dialog.locator('[data-part="event-script"] .monaco-editor').filter({ visible: true });
}

/** A widget of the editor: it floats over the window, wherever the editor puts it. */
function widget(selector: string): Locator {
    return page.locator(selector).filter({ visible: true });
}

/**
 * Writes over the script of the moment on screen, as a person types it. What the typing opened
 * over the editor closes with the next text: an Escape would reach the window too.
 */
async function typeScript(source: string): Promise<void> {
    await editorLines(dialog, 'event-script').filter({ visible: true }).first().click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(source);
}

test.beforeAll(async () => {
    sandbox = await makeSandbox();
    echo = await startEchoServer();
    ({ app, page } = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot));
    await expectFirstRun(page);
    await createConnection(page, CONNECTION, echo.url, sandbox.repoRoot);
    await page
        .getByRole('option', { name: new RegExp(CONNECTION) })
        .getByRole('button', { name: 'Connection actions' })
        .click();
    await page.getByRole('menuitem', { exact: true, name: 'Settings' }).click();

    // The dialog takes the name of the section it shows: it is the only one open.
    dialog = page.getByRole('dialog');

    await dialog.getByRole('option', { name: 'Scripts' }).click();
    await dialog.getByRole('tab', { exact: true, name: BEFORE }).click();
});

test.afterAll(async () => {
    await app.close();
    await echo.close();
    await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
});

/** The service reads scripts in a thread of the window, which the scheme of the app serves. */
test('the service of scripts runs in a thread of its own', async () => {
    await expect(editorOfScript()).toHaveCount(1);
    await expect
        .poll(() => page.workers().some((worker) => worker.url().includes('script-worker-main')))
        .toBe(true);
});

test('writing a dot after mandor offers the names of the moment', async () => {
    await typeScript('mandor.');

    const suggestions = widget('.suggest-widget');

    await expect(suggestions).toBeVisible();
    // The name alone: `sendRequest` holds `request` too.
    await expect(suggestions.getByText('request', { exact: true })).toHaveCount(1);
    await expect(suggestions.getByText('variables', { exact: true })).toHaveCount(1);
    await expect(suggestions.getByText('socket', { exact: true })).toHaveCount(0);
});

test('opening the call shows its signature', async () => {
    await typeScript('mandor.variables.set(');

    const hints = widget('.parameter-hints-widget');

    await expect(hints).toBeVisible();
    await expect(hints).toContainText('set(');
});

test('the pointer over a name tells what it is', async () => {
    await typeScript('mandor.variables;');
    await hoverWord(editorLines(dialog, 'event-script').filter({ visible: true }), 'variables');

    await expect(widget('.monaco-hover')).toContainText('MandorVariables');
});

/** Before connecting there is no response: naming it is a mistake the editor underlines. */
test('a name the moment does not show is underlined, and the line clears once it is right', async () => {
    const underlined = editorOfScript().locator('.squiggly-error');

    await typeScript('mandor.response.status;');
    await expect(underlined.first()).toBeVisible();

    await typeScript('mandor.request.url;');
    await expect(underlined).toHaveCount(0);
});

/** A name one line writes is offered where another line reads it, before any of them runs. */
test('inside the name of a variable the editor offers the ones the scripts declare', async () => {
    await typeScript('mandor.variables.set("orderId", 1);\nmandor.variables.get("');

    const suggestions = widget('.suggest-widget');

    await expect(suggestions).toBeVisible();
    await expect(suggestions.getByText('orderId', { exact: true })).toHaveCount(1);
});

test('where a line starts the editor offers the snippets of the moment, and writes one', async () => {
    await typeScript('Send');

    const suggestions = widget('.suggest-widget');

    await expect(suggestions.getByText('Send a request', { exact: true })).toBeVisible();

    await page.keyboard.press('Enter');

    await expect(editorOfScript()).toContainText('mandor.sendRequest');
});
