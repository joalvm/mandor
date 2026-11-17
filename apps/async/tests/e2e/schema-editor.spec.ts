import { readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { startEchoServer } from '../../../../packages/transport-async/tests/support/echo-server.js';
import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import { composerOf, createEvent, openEvent } from './support/collection-event.js';
import { createConnection, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox, type Sandbox } from './support/launch-app.js';

const SCHEMA = '{ "type": "object", "properties": { "id": { "type": "number", "minimum": 5 } } }';

/**
 * The lines of the schema editor, which lives in the schema tab of the strip and not inside
 * the composer: two panes hold that part name, and the visible one is the one on front.
 */
function schemaLines(page: Page) {
    return editorLines(page, 'schema-pane-editor').filter({ visible: true });
}

/** The schema written over whatever the document held, as a person would type it. */
async function writeSchema(page: Page, text: string): Promise<void> {
    const lines = schemaLines(page);

    await lines.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    await page.keyboard.insertText(text);
}

/** Whether a file the app wrote under the repo already carries the text. */
async function written(root: string, text: string): Promise<boolean> {
    const entries = await readdir(root, { recursive: true, withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile());
    const texts = await Promise.all(
        files.map((entry) => readFile(join(entry.parentPath, entry.name), 'utf8')),
    );

    return texts.some((each) => each.includes(text));
}

async function showSchema(page: Page): Promise<void> {
    await page.getByRole('tab', { name: 'Schema' }).click();

    await expect(schemaLines(page)).toBeVisible();
}

async function setup(page: Page, url: string, repoRoot: string): Promise<void> {
    await expectFirstRun(page);
    await createConnection(page, 'Echo', url, repoRoot);
    await createEvent(page, 'Saludo');
    await openEvent(page, 'Saludo');
}

/** The service of the standard language completes out of the metaschema. */
async function expectIntellisense(page: Page): Promise<void> {
    // Typed, not inserted: the suggest of the language rides the keys that write, and the
    // colon of a property is one of its triggers.
    await schemaLines(page).click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    await page.keyboard.type('{ "typ');
    await page.keyboard.type(':');

    await expect(page.locator('.suggest-widget')).toBeVisible({ timeout: 20_000 });

    await page.keyboard.press('Escape');
}

/** The body the schema asks for: applies or asks, and the answer does the replacement. */
async function generatePayload(page: Page, asks: boolean): Promise<void> {
    await page.getByRole('tab', { name: 'Message' }).click();
    await page.getByRole('button', { name: 'Generate from schema' }).click();

    const payload = editorLines(composerOf(page), 'schema-pane-editor');

    if (asks) {
        await expect(
            page.getByText('The current body has changes of its own').first(),
        ).toBeVisible();
        await page.getByRole('button', { name: 'Replace' }).click();
    }

    await expect(payload).toContainText('"id"', { timeout: 15_000 });
}

/** The schema the body tells: applies or asks, and the answer does the replacement. */
async function generateSchema(page: Page): Promise<void> {
    await showSchema(page);
    await page.getByRole('button', { name: 'Generate from body' }).click();

    // The notice and the line that reads it aloud carry the same title.
    await expect(page.getByText('The current schema carries restrictions').first()).toBeVisible();
    await page.getByRole('button', { name: 'Replace' }).click();

    await expect(schemaLines(page)).toContainText('"properties"', { timeout: 15_000 });
}

test('the schema is a tab: written with the standard, generated in both directions', async () => {
    const echo = await startEchoServer();
    const sandbox = await makeSandbox();
    const first = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);
    const running: ElectronApplication = first.app;

    try {
        const { page } = first;

        await setup(page, echo.url, sandbox.repoRoot);

        // The schema tab of the connection, written by hand with restrictions on it.
        await showSchema(page);
        await expectIntellisense(page);
        await writeSchema(page, SCHEMA);

        // The body the schema asks for lands without asking: nothing was written to protect.
        await generatePayload(page, false);

        // A body with a change of its own is asked before the generation replaces it.
        await payload(page, '{ "id": "siete" }');
        await generatePayload(page, true);

        // The schema says more than the body can rebuild: regenerating it is asked as well.
        await generateSchema(page);

        await sendAndSeeEcho(page);
    } finally {
        await running.close();
        await echo.close();
        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});

/** The generated body meets the schema it came from: the send passes, and the echo answers. */
async function sendAndSeeEcho(page: Page): Promise<void> {
    await page.getByRole('tab', { name: 'Message' }).click();
    await page.getByRole('button', { exact: true, name: 'Connect' }).press('Enter');

    await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toBeVisible();

    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.locator('[data-part="activity-panel"]')).toContainText(/saludo/i, {
        timeout: 15_000,
    });
}

/** The body written over whatever the message held, as a person would type it. */
async function payload(page: Page, text: string): Promise<void> {
    const lines = editorLines(composerOf(page), 'schema-pane-editor');

    await lines.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    await page.keyboard.insertText(text);

    await expect(lines).toHaveText(text, { timeout: 5_000 });

    // The save and the guard read the text once the state of the window has it; a click that
    // rides the very keystroke would ask over the text that was there before.
    // timing-policy: the editor shows the text before the state holds it, and nothing on screen
    // tells the two apart; a click too early replaces the body and leaves nothing to wait on.
    await page.waitForTimeout(300);
}

test('the schema survives a relaunch of the app', async () => {
    const echo = await startEchoServer();
    const sandbox: Sandbox = await makeSandbox();
    const first = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);
    let running: ElectronApplication = first.app;

    try {
        const { page } = first;

        await setup(page, echo.url, sandbox.repoRoot);
        await showSchema(page);
        await writeSchema(page, SCHEMA);

        // The save pauses while the typing settles; the relaunch reads the disk after it.
        await expect
            .poll(() => written(sandbox.repoRoot, 'minimum'), { timeout: 15_000 })
            .toBe(true);
        await running.close();

        const second = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

        running = second.app;
        await expectFirstRun(second.page);
        await expect(second.page.getByRole('tab', { name: 'Echo' })).toBeVisible();
        await showSchema(second.page);

        await expect(schemaLines(second.page)).toContainText('"minimum"', { timeout: 15_000 });
    } finally {
        await running.close();
        await echo.close();
        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
