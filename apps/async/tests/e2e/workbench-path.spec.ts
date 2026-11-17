import { rm } from 'node:fs/promises';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { startEchoServer } from '../../../../packages/transport-async/tests/support/echo-server.js';
import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import { createEvent, openEvent } from './support/collection-event.js';
import { createConnection, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox, type Sandbox } from './support/launch-app.js';
import { seedDoc } from './support/seed-doc.js';
import { dragToGroup, windowShape } from './support/window-shape.js';

const CONNECTION = 'Echo';
const DOC = 'notes.md';

/** What the list and the tab call it: the name of the file without the extension. */
const DOC_TITLE = 'notes';
const MESSAGE = 'hello from the workbench';

/** The event the connection composes. It survives the tab, so every send opens it again. */
const EVENT = 'Saludo';

/**
 * Arranging never stops the window: opening a tab, splitting the grid and dragging a tab across
 * are panels and tabs, and none of them is a modal. Creating and the settings are the
 * exceptions, and their dialog is gone before any of this is asked.
 */
async function expectNoModalWhileArranging(page: Page): Promise<void> {
    await expect(page.getByRole('dialog')).toHaveCount(0);
}

/** Opens the connection the way the collection opens it, which is where it is found again. */
async function openFromCollection(page: Page, name: string): Promise<void> {
    await page.getByRole('option', { name }).click();
    await expect(page.getByRole('tab', { name })).toBeVisible();
}

/**
 * Closes a tab through its own button, after bringing it to the front so the button shows. A tab
 * holding an edit nobody saved asks first, and the answer given is `answer`; while the question
 * is up the window behind it is hidden, so the tab is only gone once nothing is asking.
 */
async function closeTab(page: Page, name: string, answer?: string): Promise<void> {
    const tab = page.getByRole('tab', { name });
    const question = page.getByRole('alertdialog', { name: `Save the changes to “${name}”?` });

    await tab.click();
    await tab.getByRole('button', { name: 'Close tab' }).click();

    if (answer !== undefined) {
        await question.getByRole('button', { exact: true, name: answer }).click();
    }

    await expect(question).toHaveCount(0);
    await expect(tab).toHaveCount(0);
}

/** Dials the connection and waits for the socket to be up. */
async function dial(page: Page): Promise<void> {
    const button = page.getByRole('button', { exact: true, name: 'Connect' });

    await expect(button).toBeEnabled();
    await button.press('Enter');
    await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toBeVisible();
}

/** Sends one message and waits for the echo, counting every one the panel has received. */
async function sendAndSeeEcho(page: Page, inbound: number): Promise<void> {
    await openEvent(page, EVENT);
    await editorLines(
        page.getByRole('group', { name: 'Message composer' }),
        'schema-pane-editor',
    ).click();
    await page.keyboard.type(MESSAGE);
    await page.getByRole('button', { exact: true, name: 'Send' }).click();
    await expect(page.locator('[data-part="activity-row"][data-direction="in"]')).toHaveCount(
        inbound,
    );
}

/** Folds the section and opens it again, which is what reads the docs folder a second time. */
async function reopenDocsSection(page: Page): Promise<void> {
    const section = page.getByRole('button', { exact: true, name: 'Docs' });

    await section.click();
    await section.click();
    await expect(page.getByRole('option', { name: DOC_TITLE })).toBeVisible();
}

/**
 * Opens the origins in their tab. The window starts empty, so this is what the first group
 * holds on to: without a tab of its own it would close the moment the connection leaves it,
 * and the arrangement under test is two groups, not one.
 */
async function openOrigins(page: Page): Promise<void> {
    await page.getByRole('button', { exact: true, name: 'Local' }).click();
    await page.getByRole('menuitem', { name: 'Manage origins' }).click();
    await expect(
        page.locator('.dv-tabs-container').getByRole('tab', { name: 'Origins' }),
    ).toBeVisible();
}

/** Edits one setting in the settings of the app, and the window wears it once they close. */
async function editSettings(page: Page): Promise<void> {
    await page.getByRole('button', { exact: true, name: 'Settings' }).click();
    await page.getByRole('option', { name: 'Themes' }).click();
    await page.getByRole('combobox', { exact: true, name: 'Appearance' }).click();
    await page.getByRole('option', { exact: true, name: 'Hold one theme' }).click();
    await page.getByRole('combobox', { exact: true, name: 'Theme' }).click();
    await page.getByRole('option', { exact: true, name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.keyboard.press('Escape');
}

/**
 * The whole workbench in one run: the connection is found in the collection, the window is split, a
 * note of the workspace opens beside it, and the connection is handed over to that group
 * while it is talking. The echo after the move is the assertion that matters — a tab that
 * changes group and keeps its socket is what the tabs were rebuilt for.
 */
async function arrangeWorkbench(page: Page, sandbox: Sandbox, url: string): Promise<string[][]> {
    await expectFirstRun(page);
    await openOrigins(page);
    await createConnection(page, CONNECTION, url, sandbox.repoRoot);
    await createEvent(page, EVENT);
    await closeTab(page, CONNECTION);
    await openFromCollection(page, CONNECTION);
    await expectNoModalWhileArranging(page);
    await dial(page);
    await sendAndSeeEcho(page, 1);
    await seedDoc(sandbox.repoRoot, DOC, `# ${DOC}\n`);
    await reopenDocsSection(page);
    await page.getByRole('option', { name: DOC_TITLE }).click({ modifiers: ['Alt'] });
    await expect(page.locator('.dv-groupview')).toHaveCount(2);
    await expectNoModalWhileArranging(page);
    await dragToGroup(page, CONNECTION, 1);
    await sendAndSeeEcho(page, 2);
    await expectNoModalWhileArranging(page);

    return windowShape(page);
}

/** The window that comes back: same groups, same tabs, and the connection still configured. */
async function restoreWorkbench(page: Page, arranged: string[][], url: string): Promise<void> {
    await expect(page.locator('.dv-groupview')).toHaveCount(2);
    await expect.poll(() => windowShape(page)).toEqual(arranged);
    // The message typed into the event is still in the composer, and was never saved.
    await closeTab(page, CONNECTION, "Don't save");
    await openFromCollection(page, CONNECTION);
    await expect(
        page
            .locator('[data-part="connection-toolbar"]')
            .getByRole('textbox', { name: 'Connection URL' }),
    ).toHaveText(url);
    await editSettings(page);
    await expectNoModalWhileArranging(page);
}

test('arranges a connection, a note and the settings across two groups, and finds them again', async () => {
    const sandbox = await makeSandbox();
    const { defaultRepoRoot, userDataDir } = sandbox;
    const echo = await startEchoServer();
    let running: ElectronApplication | undefined;

    try {
        const first = await launch(userDataDir, defaultRepoRoot);

        running = first.app;

        const arranged = await arrangeWorkbench(first.page, sandbox, echo.url);

        await running.close();
        running = undefined;

        const second = await launch(userDataDir, defaultRepoRoot);

        running = second.app;
        await restoreWorkbench(second.page, arranged, echo.url);
    } finally {
        if (running !== undefined) {
            await running.close();
        }

        await echo.close();
        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
