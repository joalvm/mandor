import { rm } from 'node:fs/promises';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { diskTree, itemNamed, onDisk } from '../../../../tools/workspace/disk-by-name.mjs';
import { startEchoServer } from '../../../../packages/transport-async/tests/support/echo-server.js';
import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import { createEvent, openEvent } from './support/collection-event.js';
import { chooseEnvironment, createEnvironment } from './support/environment.js';
import { createConnection, defaultWorkspaceDir, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox } from './support/launch-app.js';

const ITEM = 'Pedido creado';
const PAYLOAD = '{ "id": "{{pedidoId}}" }';

/**
 * No secret variable takes part here on purpose. Declaring one asks the keychain of the system
 * to keep the value, and a machine without a keyring refuses the write instead of leaving the
 * value in the file. That a payload built with a secret leaves with the value and reaches the
 * window with the marker is proven where `readSecret` is a dependency: `ws-send.handlers.test.ts`.
 */

/**
 * Choosing the event in the tree lands it in the composer of the connection the user works in:
 * no tab of its own opens. Typing marks the section dirty, and Ctrl+S is what reaches the file.
 */
async function composeAndSave(page: Page): Promise<void> {
    await openEvent(page, ITEM);

    await expect(page.getByRole('tab', { name: ITEM })).toHaveCount(0);
    await expect(page.locator('[data-part="composer"]')).toContainText('');

    await editorLines(
        page.getByRole('group', { name: 'Message composer' }),
        'schema-pane-editor',
    ).click();
    // Inserted, not typed: the editor keeps the text exactly as it is given.
    await page.keyboard.insertText(PAYLOAD);
    await page.keyboard.press('Control+s');
}

/**
 * Leaves two sockets up against the echo server, so the item has to ask which one. Each one
 * chooses the environment for itself: nothing above the connection fills its variables.
 */
async function openTwoConnections(
    page: Page,
    url: string,
    environment: { name: string; value: string },
    repoRoot: string,
): Promise<void> {
    for (const name of ['Echo one', 'Echo two']) {
        await createConnection(page, name, url, repoRoot);

        if (name === 'Echo one') {
            // The picker lives on the strip of a connection tab: the first one is where the
            // environment gets created, and both connections then choose it for themselves.
            await createEnvironment(page, environment.name, environment.value);
        }

        await chooseEnvironment(page);
        await page.getByRole('button', { exact: true, name: 'Connect' }).click();
        await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toBeVisible();
    }
}

async function sendThroughTheConnection(page: Page): Promise<void> {
    // The event is composed inside a connection, so sending goes through it and the
    // Send-through dialog has nothing to ask.
    await page.getByRole('button', { exact: true, name: 'Send' }).click();
    await expect(page.getByRole('dialog', { name: 'Send through' })).toHaveCount(0);
}

/**
 * What left carries the value of the environment and says where it was written: the row signs
 * the frame with the event that sent it, and the dock reads the frame whole.
 */
async function expectTimeline(page: Page): Promise<void> {
    const row = page.locator('[data-part="activity-row"][data-direction="out"]');

    // The event went to the connection the user put in front: Echo one was the tab the strip was
    // showing when the item was chosen, so the frame left through it and through no other. The
    // panels of the other tabs stay mounted but out of the screen, so only the visible ones count.
    await page.getByRole('tab', { name: 'Echo one' }).click();
    await expect(page.locator('[data-part="activity-row"][data-direction="in"]')).toHaveCount(1);
    await row.click();
    await expect(row).toContainText(ITEM);
    await expect(page.locator('[data-part="activity-detail"]')).toContainText('p-1');
    await page.getByRole('tab', { name: 'Echo two' }).click();
    await expect(page.locator('[data-part="activity-row"]:visible')).toHaveCount(0);
}

/** The file keeps the template: what is resolved is the frame, never what is written down. */
async function expectItemOnDisk(repoRoot: string): Promise<void> {
    const tree = diskTree(repoRoot);
    const workspace = await defaultWorkspaceDir(repoRoot);
    const file = onDisk(
        await itemNamed(tree, `${workspace}/collections`, ['events', ITEM]),
        'the item',
    );
    const yaml = await tree.read(file);

    expect(yaml).toContain('{{pedidoId}}');
    expect(yaml).not.toContain('p-1');
}

/**
 * The template is written where every setting lives: the modal of the connection. It goes in,
 * the modal closes, and the connection carries it from then on.
 */
async function declareFrameTemplate(page: Page): Promise<void> {
    await page
        .getByRole('option', { name: /Wrapped echo/ })
        .getByRole('button', { name: 'Connection actions' })
        .click();
    await page.getByRole('menuitem', { exact: true, name: 'Settings' }).click();
    await expect(page.getByRole('dialog', { name: 'Connection' })).toBeVisible();

    const template = page.getByRole('textbox', { name: 'Frame template' });

    await template.click();
    await page.keyboard.insertText('{"event": {{event}}, "data": {{payload}}}');
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
}

/** The echo answers what left, and what left is the envelope, not the bare message. */
async function expectWrappedTimeline(page: Page): Promise<void> {
    await page.getByRole('tab', { name: 'Wrapped echo' }).click();

    const out = page.locator('[data-part="activity-row"][data-direction="out"]');
    const inbound = page.locator('[data-part="activity-row"][data-direction="in"]');
    const detail = page.locator('[data-part="activity-detail"]');

    await expect(inbound).toHaveCount(1);
    await out.click();
    await expect(detail).toContainText('"event": "Pedido creado"');
    await inbound.click();
    await expect(detail).toContainText('"data": { "id": 7 }');
}

/** Composes the payload into the event the connection holds, saves it and sends it. */
async function composeAndSend(page: Page, payload: string): Promise<void> {
    await openEvent(page, ITEM);
    await editorLines(
        page.getByRole('group', { name: 'Message composer' }),
        'schema-pane-editor',
    ).click();
    await page.keyboard.insertText(payload);
    await page.keyboard.press('Control+s');
    await page.getByRole('button', { exact: true, name: 'Send' }).click();
}

test('wraps the frame with the template its connection declares', async () => {
    const sandbox = await makeSandbox();
    const echo = await startEchoServer();
    let running: ElectronApplication | undefined;

    try {
        const launched = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);
        const page = launched.page;

        running = launched.app;
        await expectFirstRun(page);
        await createConnection(page, 'Wrapped echo', echo.url, sandbox.repoRoot);
        await declareFrameTemplate(page);

        await page.getByRole('button', { exact: true, name: 'Connect' }).click();
        await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toBeVisible();

        await createEvent(page, ITEM);
        await composeAndSend(page, '{ "id": 7 }');
        await expectWrappedTimeline(page);
    } finally {
        if (running !== undefined) {
            await running.close();
        }

        await echo.close();
        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});

test('sends a collection item through the connection that was chosen, with its value resolved', async () => {
    const sandbox = await makeSandbox();
    const echo = await startEchoServer();
    let running: ElectronApplication | undefined;

    try {
        const launched = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);
        const page = launched.page;

        running = launched.app;
        await expectFirstRun(page);
        await openTwoConnections(
            page,
            echo.url,
            { name: 'pedidoId', value: 'p-1' },
            sandbox.repoRoot,
        );
        await createEvent(page, ITEM);
        // The user goes back to Echo one with a click of the strip: the event they open from
        // here has to follow the tab they put in front, not the one the window opened last.
        await page.getByRole('tab', { name: 'Echo one' }).click();
        await composeAndSave(page);
        await sendThroughTheConnection(page);
        await expectTimeline(page);
        await expectItemOnDisk(sandbox.repoRoot);
    } finally {
        if (running !== undefined) {
            await running.close();
        }

        await echo.close();
        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
