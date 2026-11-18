import { rm } from 'node:fs/promises';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import { composerOf, createEvent, openEvent } from './support/collection-event.js';
import { createConnection, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox, type Sandbox } from './support/launch-app.js';

const EVENT = 'Pedido creado';
const DRAFT = '{ "borrador": true }';

/**
 * The app going away takes the composer's draft with it, and the app coming back gives it back:
 * every connection tab of the session lands with the event it was composing, the way the tabs
 * themselves land. Letting a tab go is another thing — the connection reopens with its composer
 * empty, because the draft died with the tab — and that is proven where the composer lays itself
 * down on the session, unit side.
 */
test('brings a connection back with the event it was composing, draft included', async () => {
    const sandbox = await makeSandbox();
    let running: ElectronApplication | undefined;

    try {
        const first = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);
        const page = first.page;

        running = first.app;
        await expectFirstRun(page);
        await createConnection(page, 'Echo', 'ws://localhost:3000', sandbox.repoRoot);
        await createEvent(page, EVENT);
        await openEvent(page, EVENT);

        // Typed, never saved: what comes back is the draft, not what the file says.
        await editorLines(composerOf(page), 'schema-pane-editor').click();
        await page.keyboard.insertText(DRAFT);
        await expectDraftHeld(page);

        await running.close();
        running = undefined;

        await expectRestored(sandbox);
    } finally {
        if (running !== undefined) {
            await running.close();
        }

        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});

/** The app comes back over the same machine, and the connection holds its draft again. */
async function expectRestored(sandbox: Sandbox): Promise<void> {
    const { app, page } = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

    try {
        await expectFirstRun(page);
        await expect(page.getByRole('tab', { name: 'Echo' })).toBeVisible();
        await expectDraftHeld(page);
    } finally {
        await app.close();
    }
}

/** The event is named over the composer, and the lines of its editor are the ones typed. */
async function expectDraftHeld(page: Page): Promise<void> {
    await expect(page.locator('[data-part="connection-crumbs"]')).toContainText(EVENT);
    await expect(editorLines(composerOf(page), 'schema-pane-editor')).toContainText(DRAFT);
}
