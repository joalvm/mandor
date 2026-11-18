import { rm } from 'node:fs/promises';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { startSocketIoServer } from '../../../../packages/transport-async/tests/support/socketio-server.js';
import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import { createEvent, openEvent } from './support/collection-event.js';
import { chooseSocketIo } from './support/connection-transport.js';
import { createConnection, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox } from './support/launch-app.js';

const CONNECTION = 'Realtime gateway';
const MESSAGE = 'hello through socket.io';
const EVENT = 'Saludo';

/**
 * Sends what the composer holds to the event it names, the ack asked for. The echo of the
 * server answers through the ack, so the run sees exactly one reply per emission: the answer
 * indented under the emission, with the time it took.
 */
async function emitAndExpectAckPair(page: Page, message: string): Promise<void> {
    await page.getByRole('checkbox', { name: 'Wait for ack' }).check();
    await editorLines(
        page.getByRole('group', { name: 'Message composer' }),
        'schema-pane-editor',
    ).click();
    await page.keyboard.type(message);
    await page.getByRole('button', { exact: true, name: 'Send' }).click();

    await expect(
        page.locator('[data-part="activity-row"][data-direction="in"][data-reply="true"]'),
    ).toHaveCount(1);
    await expect(page.locator('[data-part="activity-row"][data-reply="true"]')).toContainText(
        message,
    );
    await expect(page.locator('[data-part="activity-row"][data-reply="true"]')).toContainText(/ms/);
}

test('dials Socket.IO, emits with an ack and links the pair in the timeline', async () => {
    const sandbox = await makeSandbox();
    const server = await startSocketIoServer();
    let running: ElectronApplication | undefined;

    const { port } = new URL(server.url);

    try {
        const launched = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

        running = launched.app;
        await expectFirstRun(launched.page);
        await createConnection(
            launched.page,
            CONNECTION,
            `ws://127.0.0.1:${port}`,
            sandbox.repoRoot,
        );
        await chooseSocketIo(launched.page, CONNECTION);
        await createEvent(launched.page, EVENT);
        await openEvent(launched.page, EVENT);

        const page: Page = launched.page;

        await page.getByRole('button', { exact: true, name: 'Connect' }).click();
        await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toBeVisible();
        await emitAndExpectAckPair(page, MESSAGE);
    } finally {
        if (running !== undefined) {
            await running.close();
        }

        await server.close();
        await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    }
});
