import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Locator, type Page } from '@playwright/test';

import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import { hoverWord } from '../../../../packages/ui/tests/support/hover-word.js';
import { openSection } from '../../../../packages/ui/tests/support/open-section.js';
import { createRequest, launchSync } from './support/send-flow.js';

// One app and one request run through every test: each one starts where the last one left.
test.describe.configure({ mode: 'serial' });

const BEFORE = 'Before the request';

let root = '';
let app: ElectronApplication;
let page: Page;

function editorOfScript(): Locator {
    return page.locator('[data-part="event-script"] .monaco-editor').filter({ visible: true });
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
    await editorLines(page, 'event-script').filter({ visible: true }).first().click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(source);
}

test.beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-sync-script-editor-'));
    await mkdir(join(root, 'origins'), { recursive: true });
    app = await launchSync(root);
    page = await app.firstWindow();

    await expect(page.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();
    await createRequest(page);
    await openSection(page, 'Scripts');
    await openSection(page, BEFORE);
});

test.afterAll(async () => {
    await app.close();
    await rm(root, { force: true, maxRetries: 10, recursive: true });
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
    await expect(suggestions.getByText('response', { exact: true })).toHaveCount(0);
});

test('opening the call shows its signature', async () => {
    await typeScript('mandor.variables.set(');

    const hints = widget('.parameter-hints-widget');

    await expect(hints).toBeVisible();
    await expect(hints).toContainText('set(');
});

test('the pointer over a name tells what it is', async () => {
    await typeScript('mandor.variables;');
    await hoverWord(editorLines(page, 'event-script').filter({ visible: true }), 'variables');

    await expect(widget('.monaco-hover')).toContainText('MandorVariables');
});

/** Before the request there is no response: naming it is a mistake the editor underlines. */
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

test('a script is written line by line, spaces and all', async () => {
    await typeScript('const a = 1;');
    await page.keyboard.press('Enter');
    await page.keyboard.type('const b = 2;');

    await expect(editorOfScript().locator('.line-numbers').filter({ hasText: /\d/ })).toHaveCount(
        2,
    );
    await expect(editorOfScript()).toContainText('const b = 2;');
});

test('where a line starts the editor offers the snippets of the moment, and writes one', async () => {
    await typeScript('Send');

    const suggestions = widget('.suggest-widget');

    await expect(suggestions.getByText('Send a request', { exact: true })).toBeVisible();

    await page.keyboard.press('Enter');

    await expect(editorOfScript()).toContainText('mandor.sendRequest');
});

/**
 * A script brought from another app names an API that does not run here. The editor says whose
 * it is, and the bulb writes it in mandor.: the lines of the caret, or the whole script. What has
 * no counterpart stays as it was, underlined.
 */
test('what a script names of another app is underlined, and the bulb converts it', async () => {
    const underlined = editorOfScript().locator('.squiggly-error');
    const bulb = widget('.action-widget');

    await typeScript('pm.environment.get("x");\nbru.runRequest("y");\npm.variables.get("z");');
    await expect(underlined.first()).toBeVisible();
    await hoverWord(editorLines(page, 'event-script').filter({ visible: true }), 'environment');
    await expect(widget('.monaco-hover')).toContainText('This is from Postman: Convert to mandor.');

    await page.keyboard.press('ControlOrMeta+Period');
    await expect(bulb.getByText('Convert the whole script to mandor.')).toBeVisible();
    await bulb.getByText('Convert to mandor.', { exact: true }).click();

    await expect(editorOfScript()).toContainText('mandor.variables.get("z")');
    await expect(editorOfScript()).toContainText('pm.environment.get("x")');

    // Back to the first line, by the pointer: a key to the top of the text is not the same key on
    // every system.
    await editorLines(page, 'event-script')
        .filter({ visible: true })
        .locator('.view-line')
        .first()
        .click();
    await page.keyboard.press('ControlOrMeta+Period');
    await bulb.getByText('Convert the whole script to mandor.').click();

    await expect(editorOfScript()).toContainText('mandor.variables.get("x")');
    await expect(editorOfScript()).toContainText('bru.runRequest("y")');
    await expect(underlined).toHaveCount(1);
});

/**
 * In the smallest window the half of the request has no room for the moments in a column and a
 * script beside them: the moments go over the script, and a line of it reads whole.
 */
test('in the smallest window the moments go over the script, which keeps the width', async () => {
    await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.setSize(1024, 640);
    });

    await expect(page.getByRole('tablist', { name: 'Moment of the send' })).toHaveAttribute(
        'aria-orientation',
        'horizontal',
    );

    await typeScript('mandor.variables;');
    await expect(
        editorLines(page, 'event-script').filter({ visible: true }).locator('.view-line'),
    ).toHaveCount(1);
});
