import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import {
    startEchoServer,
    type EchoServer,
} from '../../../../packages/transport-async/tests/support/echo-server.js';
import {
    startSocketIoServer,
    type SocketIoServer,
} from '../../../../packages/transport-async/tests/support/socketio-server.js';
import {
    ATTACK,
    ATTACK_MARK,
    makeMaliciousRepo,
} from '../../../../tools/workspace/malicious-repo.mjs';
import { secretInWindow } from '../../../../tools/workspace/window-secrets.mjs';
import {
    approveScript,
    BEFORE,
    connect,
    consolePanel,
    disconnect,
    giveTheSecret,
    inConsole,
    markPlanted,
    ON_MESSAGE,
    openConnection,
    rowsOf,
    SCRIPT_FAILED,
    scriptRows,
    switchScripts,
    waitsForApproval,
} from './support/attack-flow.js';
import { startAttackEvil, type AttackEvil } from './support/attack-evil.js';
import { expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox, type Sandbox } from './support/launch-app.js';
import { addOrigin, LOCAL, switchToOrigin } from './support/origin-flow.js';

// One app and one hostile origin run through every test: each one starts where the last one left.
test.describe.configure({ mode: 'serial' });
// skip-policy: macOS runs the representative scripts.spec of the milestone; the full matrix of
// the attacks already ran on Linux and Windows here.
test.skip(process.platform === 'darwin', 'macOS runs the representative matrix only');
// Every long wait here is a cut or an out-of-memory the app itself makes: the budget is room
// for the worker to die on its own terms, never a clock the test sleeps against.
test.setTimeout(120_000);

let sandbox: Sandbox;
let app: ElectronApplication;
let page: Page;
let evil: AttackEvil;
let echo: EchoServer;
let socketIo: SocketIoServer;
let secret: string;

test.beforeAll(async () => {
    sandbox = await makeSandbox();
    await rm(ATTACK_MARK, { force: true });
    secret = `tok-attack-${crypto.randomUUID()}`;
    evil = await startAttackEvil(secret);
    echo = await startEchoServer();
    socketIo = await startSocketIoServer();
    const hostile = await makeMaliciousRepo(sandbox.root, {
        api: evil.url,
        evilHttp: evil.url,
        kind: 'async',
        socketIo: socketIo.url,
        ws: echo.url,
    });

    ({ app, page } = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot));
    await expectFirstRun(page);
    await addOrigin(page, { name: ATTACK.originName, url: hostile.url });
    await switchToOrigin(page, LOCAL, ATTACK.originName);
    await expect(
        page.getByRole('option', { name: new RegExp(ATTACK.connections.spy) }),
    ).toBeVisible({
        timeout: 60_000,
    });
    await giveTheSecret(page, secret);
});

test.afterAll(async () => {
    await app.close();
    await evil.close();
    await echo.close();
    await socketIo.close();
    await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    await rm(ATTACK_MARK, { force: true });
});

test('opening the hostile origin brings the connections in running none of them', async () => {
    // The sidebar naming the connection is the mark of the import: the scripts are here, as files.
    await expect(
        page.getByRole('option', { name: new RegExp(ATTACK.connections.spy) }),
    ).toBeVisible();
    expect(echo.clientCount()).toBe(0);
    expect(socketIo.clientCount()).toBe(0);
    expect(evil.hits).toEqual([]);
    expect(await markPlanted()).toBe(false);
});

test('connecting without approval opens the socket without the scripts', async () => {
    await openConnection(page, ATTACK.connections.spy);
    await connect(page);

    // The socket itself opened, with the secret of its own header: no script touched it.
    await expect.poll(() => echo.clientCount()).toBe(1);
    expect(echo.lastHeaders()['x-api-key']).toBe(secret);
    await expect(scriptRows(page).filter({ hasText: BEFORE }).first()).toContainText(
        '1 not approved',
    );
    expect(evil.hits).toEqual([]);
    await disconnect(page);
});

test('approved, every escape fails inside and evil gets nothing', async () => {
    await approveScript(page, ATTACK.connections.spy, BEFORE);
    await connect(page);

    await expect.poll(() => echo.clientCount()).toBe(1);
    await expect
        .poll(() => evil.hits.filter((hit) => hit.url.includes(ATTACK.sentPath)).length)
        .toBe(1);

    const sent = evil.hits.find((hit) => hit.url.includes(ATTACK.sentPath));

    expect(evil.carriesSecret(sent ?? { body: '', headers: {}, method: '', url: '' })).toBe(false);
    expect(echo.lastHeaders()['x-api-key']).toBe(secret);
    await inConsole(page, async () => {
        // `att-ctor` answers with the guest's own refusal — `'process' is not defined` — and the
        // stack it prints walks frames of the guest alone: nothing of the host came back.
        for (const line of [
            'att-process:undefined',
            'att-require:undefined',
            'att-fetch:undefined',
            'att-wasm:undefined',
            "att-ctor:'process' is not defined",
            'att-stack:',
            "att-fs:'require' is not defined",
            ATTACK.marks.batch,
        ]) {
            await expect(consolePanel(page).getByText(line).first()).toBeVisible();
        }

        // The stack the guest printed names its own script alone: no path, module or file of the host.
        const stack = await consolePanel(page)
            .getByText(/^att-stack:/u)
            .first()
            .textContent();

        expect(stack ?? '').not.toMatch(/node:|\.ts:|file:|[\\/]/u);
    });
    expect(await markPlanted()).toBe(false);
    await disconnect(page);
});

test('a socket.io handshake touched by a script opens without the secrets', async () => {
    await approveScript(page, ATTACK.connections.siphon, BEFORE);
    await openConnection(page, ATTACK.connections.siphon);
    await connect(page);

    await expect.poll(() => socketIo.clientCount()).toBe(1);

    // The line of the connection wears the mark, and its detail says what to do about it.
    const row = scriptRows(page).filter({ hasText: BEFORE }).first();

    await expect(row).toContainText('no secrets', { timeout: 20_000 });
    await row.click();
    await expect(page.locator('[data-part="activity-detail"]')).toContainText(
        'polling follows redirects',
    );

    const handshake = socketIo.lastHandshake();

    // The query line the script wrote resolves with the secrets off: the literal travels.
    expect(handshake?.query['q']).toBe(`{{${ATTACK.secretName}}}`);
    expect(
        evil.carriesSecretIn({ headers: handshake?.headers ?? {}, query: handshake?.query }),
    ).toBe(false);
    await disconnect(page);
});

test('a script that answers every frame tops out and the window answers', async () => {
    await approveScript(page, ATTACK.connections.echo, ON_MESSAGE);
    await openConnection(page, ATTACK.connections.echo);
    await connect(page);

    echo.broadcastText('hola');
    await expect(rowsOf(page, 'in', 'hola').first()).toBeVisible();
    await inConsole(page, async () => {
        // The frame answers with a burst, so a ceiling of `socket.send` is reached — the cap of
        // one run or the cap of a second, whichever the burst meets first — and named in a line.
        await expect(
            consolePanel(page)
                .getByText(/socket\.send/u)
                .first(),
        ).toBeVisible({
            timeout: 30_000,
        });
    });

    // While the echo tops out, the window still answers.
    await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toBeVisible();
    await disconnect(page);
});

test('a never-ending script before the socket is cut and the socket opens without it', async () => {
    await approveScript(page, ATTACK.connections.loop, BEFORE);
    await openConnection(page, ATTACK.connections.loop);
    await page.getByRole('button', { exact: true, name: 'Connect' }).click();
    await page.locator('[data-part="activity-fault-row"]').last().click();

    const detail = page.locator('[data-part="activity-detail"]');

    await expect(detail).toContainText(SCRIPT_FAILED, { timeout: 20_000 });
    await detail.getByRole('button', { exact: true, name: 'Connect without scripts' }).click();
    await expect.poll(() => echo.clientCount()).toBe(1);
    await disconnect(page);
});

test('a frame that blows the worker dies alone and the next frame runs', async () => {
    await approveScript(page, ATTACK.connections.bomb, ON_MESSAGE);
    await openConnection(page, ATTACK.connections.bomb);
    await connect(page);

    echo.broadcastText('boom');
    await expect(rowsOf(page, 'in', 'boom').first()).toBeVisible({ timeout: 20_000 });
    echo.broadcastText('pings');
    await inConsole(page, async () => {
        await expect(consolePanel(page).getByText(ATTACK.marks.bomb).first()).toBeVisible({
            timeout: 30_000,
        });
    });
    await expect(page.getByRole('button', { exact: true, name: 'Disconnect' })).toBeVisible();
    await disconnect(page);
});

test('switched off, nothing runs and the timeline says so', async () => {
    const hits = evil.hits.length;

    await switchScripts(page, false);
    await openConnection(page, ATTACK.connections.spy);
    await connect(page);

    await expect(scriptRows(page).filter({ hasText: BEFORE }).first()).toContainText(
        '1 switched off',
    );
    await expect.poll(() => echo.clientCount()).toBe(1);
    expect(evil.hits.length).toBe(hits);
    await disconnect(page);
    await switchScripts(page, true);
});

/** The file of one hostile connection in the clone of the origin: the repo the run never made. */
async function hostileConnectionFile(name: string): Promise<string> {
    const repos = join(sandbox.defaultRepoRoot, 'realtime');
    const clone = (await readdir(repos)).find((entry) => entry !== 'local') ?? 'none';

    return join(repos, clone, 'workspaces', 'payments', 'connections', `${name}.yaml`);
}

test('a pull that rewrites an approved script asks again', async () => {
    const file = await hostileConnectionFile(ATTACK.connections.spy);
    const text = await readFile(file, 'utf8');

    await writeFile(file, text.replace(ATTACK.marks.batch, 'attack-batch-two'), 'utf8');
    // The window taking the focus is what brings an origin up to date when nothing else did.
    await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.emit('focus');
    });

    // The new text reaches the window as one nobody approved: the old approval does not stand.
    await expect
        .poll(() => waitsForApproval(page, ATTACK.connections.spy, BEFORE), { timeout: 30_000 })
        .toBe(true);

    const hits = evil.hits.length;

    await openConnection(page, ATTACK.connections.spy);
    await connect(page);
    await expect(scriptRows(page).filter({ hasText: BEFORE }).first()).toContainText(
        '1 not approved',
    );
    await disconnect(page);
    expect(evil.hits.length).toBe(hits);
});

test('the window never holds the value of the secret', async () => {
    // Nothing under a global of the window, and no spelling of it in what the window shows.
    expect(await secretInWindow(page, secret)).toEqual({ held: [], shown: [] });
});
