import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import {
    startEchoServer,
    type EchoServer,
} from '../../../../packages/transport-async/tests/support/echo-server.js';
import {
    expectBackAfterRounds,
    settledMemory,
    type ExpectNoDrift,
    type WaitUntil,
} from '../../../../packages/host/tests/support/memory-drift.js';
import { diskTree, entityNamed, onDisk } from '../../../../tools/workspace/disk-by-name.mjs';
import {
    approveScript,
    connect,
    consolePanel,
    disconnect,
    inConsole,
    ON_MESSAGE,
    openConnection,
    rowsOf,
} from './support/attack-flow.js';
import { createConnection, defaultWorkspaceDir } from './support/first-run.js';
import { launch, makeSandbox, type Sandbox } from './support/launch-app.js';

// skip-policy: the memory ceilings of the spike were measured on the Linux container; a hosted
// runner of another system would read its own machine as a leak.
test.skip(process.platform !== 'linux', 'the ceilings were measured on Linux');

/** The frames of the burst, in waves the queue of a connection can drain between them. */
const WAVES = 10;
const PER_WAVE = 1_000;

const until: WaitUntil = (ready) => expect.poll(ready, { timeout: 60_000 }).toBe(true);
const noDrift: ExpectNoDrift = (drift) => expect.poll(drift, { timeout: 60_000 }).toEqual([]);

// Ten thousand frames through one worker and a worker that dies on a frame: the budget is of
// the app under load, not of a clock the test waits on.
test.setTimeout(10 * 60_000);

let sandbox: Sandbox;
let app: ElectronApplication;
let page: Page;
let echo: EchoServer;

/** The log every frame costs, small on purpose: the burst is of the queue, not of the output. */
const QUIET_LOG = "console.log('mem ' + String(mandor.message.text).slice(0, 8));";
/** The frame that kills its worker, and the one that proves the next frame ran. */
const BOOM = [
    'if (mandor.message.text === "boom") {',
    '  const a = [];',
    '  while (true) { a.push("x".repeat(1024 * 1024)); }',
    '}',
    "console.log('vivo ' + String(mandor.message.text).slice(0, 8));",
].join('\n');

/** Where the file of one connection lives, by the name the screen shows. */
async function connectionFile(name: string): Promise<string> {
    const tree = diskTree(sandbox.repoRoot);
    const workspace = await defaultWorkspaceDir(sandbox.repoRoot);
    const file = onDisk(
        await entityNamed(tree, `${workspace}/connections`, name),
        'the connection',
    );

    return join(sandbox.repoRoot, file);
}

/** Adds the script of one moment to a connection on disk, the way a pull would bring it. */
async function addScript(name: string, event: string, source: string): Promise<void> {
    const file = await connectionFile(name);
    const text = await readFile(file, 'utf8');
    const indented = source
        .split('\n')
        .map((row) => `      ${row}`)
        .join('\n');
    const block = `scripts:\n  ${event}:\n    source: |-\n${indented}\n`;

    await writeFile(file, text.endsWith('\n') ? text + block : `${text}\n${block}`, 'utf8');
}

/** The resident memory of main, read where it lives: the worker of the socket is a thread of it. */
function rssMb(app: ElectronApplication): Promise<number> {
    // The `process` the evaluate sees is not the one of main whole: its modules come from the
    // builtin loader, the same door `readMain` of the memory sampler goes through.
    return app.evaluate(
        () => process.getBuiltinModule('node:process').memoryUsage().rss / 1024 / 1024,
    );
}

test.beforeAll(async () => {
    sandbox = await makeSandbox();
    echo = await startEchoServer();
    ({ app, page } = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot));
    await expect(page.getByRole('button', { exact: true, name: 'Personal' })).toBeVisible();
    await createConnection(page, 'Memoria', echo.url, sandbox.repoRoot);
    await createConnection(page, 'Roto', echo.url, sandbox.repoRoot);
    await addScript('Memoria', 'onMessage', QUIET_LOG);
    await addScript('Roto', 'onMessage', BOOM);
});

/**
 * The console draws only the lines on screen and opens on the newest: a line written early in a
 * long run is looked for the way a person does, from the top down, one screen at a time.
 */
async function seekInConsole(text: RegExp): Promise<void> {
    const log = consolePanel(page).locator('[data-part="log-lines"]');
    const line = consolePanel(page).getByText(text).first();
    const screen = await log.evaluate((element) => element.clientHeight);

    await log.hover();
    await page.mouse.wheel(0, -10_000_000);
    await expect
        .poll(
            async () => {
                if (await line.isVisible()) {
                    return true;
                }

                await page.mouse.wheel(0, screen);

                return false;
            },
            { intervals: [50], timeout: 60_000 },
        )
        .toBe(true);
}

test.afterAll(async () => {
    await app.close();
    await echo.close();
    await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
});

test('ten thousand frames through one worker leave the window where it started', async () => {
    await approveScript(page, 'Memoria', ON_MESSAGE);
    await openConnection(page, 'Memoria');
    await connect(page);

    // The wave is over when its last frame shows: the queue drains between waves, never past
    // its own ceiling, and what did not fit is dropped with a line of its own.
    const wave = async (): Promise<void> => {
        const last = `fin ${crypto.randomUUID()}`;

        for (let index = 0; index < PER_WAVE - 1; index += 1) {
            echo.broadcastText(`ola ${crypto.randomUUID()}`);
        }

        echo.broadcastText(last);
        await expect(rowsOf(page, 'in', last).first()).toBeVisible({ timeout: 60_000 });

        await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toBeVisible();
    };

    await expectBackAfterRounds({ app, page, until, noDrift }, wave, WAVES);

    await inConsole(page, async () => {
        await expect(consolePanel(page).getByText('mem ').first()).toBeVisible();
        // A burst over the queue of the connection is dropped and counted, never held.
        await seekInConsole(/arrived while the queue was full/u);
    });
});

test('a frame that kills its worker dies alone and the memory comes back', async () => {
    const base = await settledMemory(app, page, until);

    await approveScript(page, 'Roto', ON_MESSAGE);
    await openConnection(page, 'Roto');
    await connect(page);

    echo.broadcastText('boom');
    await expect(rowsOf(page, 'in', 'boom').first()).toBeVisible({ timeout: 30_000 });
    echo.broadcastText('pings');
    await inConsole(page, async () => {
        await expect(consolePanel(page).getByText('vivo pings').first()).toBeVisible({
            timeout: 30_000,
        });
    });
    await expectBackAfterRounds(
        { app, page, until, noDrift },
        async () => {
            echo.broadcastText('latido');
            await expect(rowsOf(page, 'in', 'latido').first()).toBeVisible({ timeout: 30_000 });
        },
        3,
    );
    expect(await rssMb(app)).toBeLessThan(base.workingSetMb + 64);
    await disconnect(page);
});

test('a connection gone quiet closes its worker and gives the memory back', async () => {
    const quiet = await rssMb(app);

    // The connection of the frame before is the one on screen: it opens again, takes one frame,
    // and then stands quiet — the worker it took is what has to go.
    await connect(page);
    echo.broadcastText('un marco mas');
    await expect(rowsOf(page, 'in', 'un marco mas').first()).toBeVisible({ timeout: 30_000 });

    // The worker of the socket stays for `workerIdleMs` after the last frame and then goes, the
    // socket still open: the reading waits for the fall, by condition, not by a clock of its own.
    const withWorker = await rssMb(app);

    await expect
        .poll(async () => (await rssMb(app)) < withWorker - 8, { timeout: 120_000 })
        .toBe(true);
    expect(await rssMb(app)).toBeLessThan(quiet + 64);
    await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toBeVisible();
    await disconnect(page);
});
