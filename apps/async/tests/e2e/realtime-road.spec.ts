import { readFileSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type ElectronApplication, type Locator, type Page } from '@playwright/test';

import { startSocketIoServer } from '../../../../packages/transport-async/tests/support/socketio-server.js';
import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import { createEvent, openEvent } from './support/collection-event.js';
import { chooseSocketIo } from './support/connection-transport.js';
import { createWorkspace, importDocument, openWorkspacesPanel } from './support/workspace-doc.js';
import { createConnection, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox } from './support/launch-app.js';

const FIXTURE = readFileSync(
    fileURLToPath(
        new URL(
            '../../../../packages/interop-formats/tests/asyncapi/fixtures/pasarela-3.yaml',
            import.meta.url,
        ),
    ),
    'utf8',
);

const MESSAGE = 'hello through the whole road';

/**
 * The whole road in one run. Every piece keeps its own spec: this one walks them in sequence —
 * a document comes in, a socket speaks with its ack, the server dies and the connection finds
 * its way back, the timeline is filtered, and the workspace comes back out of an export and in
 * again with nothing lost — to prove they fit. What the walk breaks gets fixed here: this is
 * where the seams between pieces show up.
 */
test('a document, a socket, a lost server and an export fit together end to end', async () => {
    // Six paths in one run: the budget of the config counts a single dial, not this walk.
    test.setTimeout(240_000);

    const sandbox = await makeSandbox();
    const exportsDir = await prepareExports(sandbox.root);

    let server = await startSocketIoServer();
    let running: ElectronApplication | undefined;

    /** Kills the live server and brings it back on the same port, the way a crash returns. */
    async function dieAndComeBack(): Promise<void> {
        await server.close();
        server = await startSocketIoServer(Number(new URL(server.url).port));
    }

    try {
        const { app, page } = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot, {
            MANDOR_SAVE_DIR: exportsDir,
        });

        running = app;

        await expectFirstRun(page);

        const { port } = new URL(server.url);

        // The socket speaks first, in the workspace the run starts with: the helper that
        // names a connection reads the active workspace on disk.
        await speakThroughTheSocket(page, `ws://127.0.0.1:${port}`, sandbox.repoRoot);

        await dieAndComeBack();
        await expectTheConnectionBack(page);

        await readTheTimeline(page);
        await bringDocumentIn(page);

        const exported = await bringDocumentBackOut(page, exportsDir);

        await bringItInAgain(page, exported);
    } finally {
        await closeTheRoad(running, server, sandbox.root);
    }
});

async function prepareExports(root: string): Promise<string> {
    const exportsDir = join(root, 'exports');

    await mkdir(exportsDir, { recursive: true });

    return exportsDir;
}

/** Whatever state the road died in, nothing of the run stays alive behind it. */
async function closeTheRoad(
    running: ElectronApplication | undefined,
    server: { close(): Promise<void> },
    root: string,
): Promise<void> {
    if (running !== undefined) {
        await running.close();
    }

    await server.close();
    await rm(root, { force: true, maxRetries: 10, recursive: true });
}

/** One workspace of its own, the document dropped in, its collection answering for every message. */
async function bringDocumentIn(page: Page): Promise<void> {
    await openWorkspacesPanel(page, 'Personal');
    await createWorkspace(page, 'Pasarela');
    await importDocument(page, 'pasarela.yaml', FIXTURE);

    // What the document carries is now the collection of the workspace: the events the client can
    // send, grouped as the document tags them, each one named as the wire calls it.
    await expect(page.getByRole('treeitem', { name: /recibos/ }).first()).toBeVisible();
    await expect(page.getByRole('treeitem', { name: /recibos\/salientes/ })).toBeVisible();
    await expect(page.getByRole('treeitem', { name: /avisos\/salientes/ })).toBeVisible();
}

async function speakThroughTheSocket(page: Page, url: string, repoRoot: string): Promise<void> {
    await createConnection(page, 'Gateway', url, repoRoot);

    await chooseSocketIo(page, 'Gateway');

    await createEvent(page, 'Saludo');
    await openEvent(page, 'Saludo');

    await page.getByRole('button', { exact: true, name: 'Connect' }).click();
    await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toBeVisible();

    await page.getByRole('checkbox', { name: 'Wait for ack' }).check();
    await editorLines(
        page.getByRole('group', { name: 'Message composer' }),
        'schema-pane-editor',
    ).click();
    await page.keyboard.type(MESSAGE);
    await page.getByRole('button', { exact: true, name: 'Send' }).click();

    // The reply arrives bound to the emission that asked for it, with its time attached.
    await expect(
        page.locator('[data-part="activity-row"][data-direction="in"][data-reply="true"]'),
    ).toHaveCount(1);
    await expect(page.locator('[data-part="activity-row"][data-reply="true"]')).toContainText(
        MESSAGE,
    );
}

/** The server dies, the connection counts its attempts, and the dot comes back to open. */
async function expectTheConnectionBack(page: Page): Promise<void> {
    const row = page.getByRole('option', { name: /Gateway/ });
    const tab: Locator = page.getByRole('tab', { name: 'Gateway' });

    await expect(tab.getByRole('img', { name: 'Connecting' })).toBeVisible();
    await expect(row.locator('[aria-label^="Attempt "]')).toBeVisible();

    await expect(tab.getByRole('img', { exact: true, name: 'Connected' })).toBeVisible({
        timeout: 15_000,
    });
    await expect(row.locator('[aria-label^="Attempt "]')).toHaveCount(0);
}

/** The timeline answers a query that matches nothing, and gives every line back afterwards. */
async function readTheTimeline(page: Page): Promise<void> {
    const search = page.getByRole('searchbox', { name: 'Search', exact: true });
    const log = page.getByRole('log', { name: 'Activity' });

    await search.click();
    await search.pressSequentially('nothing matches this');

    await expect(log.getByRole('option')).toHaveCount(0);

    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');

    await expect(log.getByRole('option').first()).toBeVisible();
}

/** The export door, in the menu of the collection: the tree offers everything marked, and the marked is written where the dialog answers. */
async function bringDocumentBackOut(page: Page, exportsDir: string): Promise<string> {
    const collection = page.getByRole('treeitem', { level: 1 }).first();

    await collection.getByRole('button', { name: 'Row options' }).click();
    await page.getByRole('menuitem', { name: 'Export…' }).click();

    const tree = page.locator('[data-part="choice-tree"]');

    await expect(tree.getByRole('treeitem').first()).toHaveText('Pasarela');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    const text = await readFile(join(exportsDir, 'pasarela.yaml'), 'utf8');

    // The document leaves with the addresses the collection holds, and the arrow the client
    // speaks them with.
    expect(text).toContain('asyncapi: 3.0.0');
    expect(text).toContain('address: recibos/salientes');
    expect(text).toContain('address: avisos/salientes');
    expect(text).toContain('action: receive');

    return text;
}

/** The way back: the file goes into a workspace that holds nothing, and its collection answers. */
async function bringItInAgain(page: Page, text: string): Promise<void> {
    await openWorkspacesPanel(page, 'Pasarela');
    await createWorkspace(page, 'Otro');
    await importDocument(page, 'pasarela.yaml', text);

    await expect(page.getByRole('treeitem', { name: /recibos\/salientes/ })).toBeVisible();
    await expect(page.getByRole('treeitem', { name: /avisos\/salientes/ })).toBeVisible();
}
