import { rm } from 'node:fs/promises';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import { composerOf, createEvent, openEvent } from './support/collection-event.js';
import { watchCspViolations } from '../../../../packages/ui/tests/support/csp-violations.js';
import { createConnection, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox } from './support/launch-app.js';

/** A URL nothing answers on. The editor is what is written in here, never the socket. */
const NOWHERE = 'wss://127.0.0.1:9/socket';

const EVENT = 'Pedido creado';

type EditCommand = 'selectAll' | 'undo';

/** What a line of the Edit menu runs: the browser's own command, on whatever holds the focus. */
async function fromEditMenu(app: ElectronApplication, command: EditCommand): Promise<void> {
    await app.evaluate(({ BrowserWindow }, name) => {
        BrowserWindow.getAllWindows()[0]?.webContents[name]();
    }, command);
}

/** A first run that ends with an event the connection holds, not open yet. */
async function holdEvent(page: Page, repoRoot: string): Promise<void> {
    await expectFirstRun(page);
    await createConnection(page, 'menu', NOWHERE, repoRoot);
    await createEvent(page, EVENT);
}

/** Undo takes back what was typed, and select all takes the whole document, not what is drawn. */
async function expectMenuEdits(app: ElectronApplication, page: Page): Promise<void> {
    const payload = editorLines(composerOf(page), 'schema-pane-editor');

    await payload.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    await page.keyboard.type('hola');
    await expect(payload).toHaveText('hola');

    await fromEditMenu(app, 'undo');
    await expect(payload).toHaveText('');
    await page.keyboard.type('hola');
    await fromEditMenu(app, 'selectAll');
    await page.keyboard.type('adios');
    await expect(payload).toHaveText('adios');
}

/**
 * The input of the editor holds a few lines around the cursor and none of its history, so a
 * menu that reached it untouched would undo nothing and select a handful of lines. What the
 * menu does is what the keyboard does: over the whole document, through its own history.
 */
test('answers the Edit menu of the window over the whole document', async () => {
    const sandbox = await makeSandbox();
    let running: ElectronApplication | undefined;

    try {
        const { app, page } = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

        running = app;
        await holdEvent(page, sandbox.repoRoot);

        // Watched from the first editor on: what the policy says about the rest of the window is
        // not what this run is about.
        const refused = watchCspViolations(page);

        await openEvent(page, EVENT);
        await expectMenuEdits(app, page);

        expect(refused).toEqual([]);
    } finally {
        if (running !== undefined) {
            await running.close();
        }

        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
