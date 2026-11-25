import { readFile, rm, writeFile } from 'node:fs/promises';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { editorLines } from '../../../../packages/ui/tests/support/editor-lines.js';
import {
    ATTACK,
    ATTACK_MARK,
    makeMaliciousRepo,
} from '../../../../tools/workspace/malicious-repo.mjs';
import { secretInWindow } from '../../../../tools/workspace/window-secrets.mjs';
import {
    BAND,
    consolePanel,
    giveTheSecret,
    hostileRepoRoot,
    inConsole,
    LOCAL,
    markPlanted,
    openHostileOrigin,
    openItem,
    send,
    sendApproved,
    SCRIPT_FAILED,
    switchScripts,
} from './support/attack-flow.js';
import { startAttackServer, type AttackHit, type AttackServer } from './support/attack-server.js';
import { itemFile } from './support/disk-names.js';
import { launch, makeSandbox, type Sandbox } from './support/launch-app.js';
import { bringToFront } from './support/origin-flow.js';
import { openSection } from '../../../../packages/ui/tests/support/open-section.js';

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
let server: AttackServer;
let secret: string;

/** The hit a question about the evil server returns when nothing arrived yet. */
const EMPTY_HIT: AttackHit = { body: '', headers: {}, method: '', url: '' };

/** A hit of the evil server by path, or an empty one when none arrived yet. */
function stolen(path: string) {
    return server.evilHits.find((hit) => hit.url.includes(path)) ?? EMPTY_HIT;
}

test.beforeAll(async () => {
    sandbox = await makeSandbox();
    await rm(ATTACK_MARK, { force: true });
    secret = `tok-attack-${crypto.randomUUID()}`;
    server = await startAttackServer(secret);
    const hostile = await makeMaliciousRepo(sandbox.root, {
        api: server.api,
        evilHttp: server.evil,
        kind: 'sync',
    });

    ({ app, page } = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot));
    await expect(page.getByRole('button', { exact: true, name: LOCAL })).toBeVisible();
    await openHostileOrigin(page, hostile.url);
    await giveTheSecret(page, secret);
});

test.afterAll(async () => {
    await app.close();
    await server.close();
    await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
    await rm(ATTACK_MARK, { force: true });
});

test('opening the hostile origin brings the scripts in running none of them', async () => {
    // The tree naming the collection is the mark of the import: the scripts are here, as files.
    await expect(page.getByRole('treeitem', { name: ATTACK.collection })).toBeVisible();
    expect(server.evilHits).toEqual([]);
    expect(await markPlanted()).toBe(false);
});

test('a send without approval leaves without the scripts, carrying what the person wrote', async () => {
    await openItem(page, ATTACK.requests.steal);

    const echoes = server.echoes.length;

    await send(page);
    await expect(page.getByText('Sent without 3 unapproved scripts')).toBeVisible();

    // The request itself went out, with the secret of its own header: no script touched it.
    await expect.poll(() => server.echoes.length).toBe(echoes + 1);
    expect(server.echoes.at(-1)?.url).toBe('/echo');
    expect(server.echoes.at(-1)?.headers['x-api-key']).toBe(secret);
    expect(server.evilHits).toEqual([]);
});

test('approved, every escape fails inside and the secret stays home', async () => {
    await sendApproved(page, 3);

    // The script moved the destination: the send reached evil, stripped of every secret form.
    await expect
        .poll(() => server.evilHits.filter((hit) => hit.url.includes(ATTACK.stealPath)).length)
        .toBe(1);
    expect(server.carriesSecret(stolen(ATTACK.stealPath))).toBe(false);
    expect(stolen(ATTACK.stealPath).headers['x-got']).toBe('undefined');
    expect(stolen(ATTACK.stealPath).headers['x-copy']).toBe(`{{${ATTACK.secretName}}}`);
    expect(stolen(ATTACK.stealPath).headers['x-folder']).toBe(`{{${ATTACK.secretName}}}`);
    // The line the person nested one level deep reached evil as text, never as the secret.
    expect(stolen(ATTACK.stealPath).headers['x-nested']).toBeDefined();
    expect(String(stolen(ATTACK.stealPath).headers['x-nested'])).not.toContain(secret);
    const echoes = server.echoes.length;

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
            ATTACK.marks.folder,
            ATTACK.marks.steal,
            `The variable “${ATTACK.secretName}” is a secret: a script cannot read it`,
            // The moved destination is said where the rest of the send is told.
            'A script changed the destination: it left without secrets',
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
    expect(server.echoes.length).toBe(echoes);
    expect(await markPlanted()).toBe(false);
});

test('an influenced redirect strips the secret header at the hop and says so', async () => {
    await openItem(page, ATTACK.requests.redirect);
    await sendApproved(page, 1);

    // Both sends followed the redirect: the one that opened the review and the one after the
    // approval. Each hop is what the other origin was handed, in order.
    const hopHits = () => server.evilHits.filter((hit) => hit.url.includes(ATTACK.hopPath));

    await expect.poll(hopHits).toHaveLength(2);

    const [before, after] = hopHits();

    // Before the approval the script had not run: its header crossed in neither send.
    expect(before?.headers['x-next']).toBeUndefined();
    // After it ran, what it wrote crossed over — a script may move headers, not secrets.
    expect(after?.headers['x-next']).toBe('next');
    expect(after?.headers['x-api-key']).toBeUndefined();
    expect(server.carriesSecret(before ?? EMPTY_HIT)).toBe(false);
    expect(server.carriesSecret(after ?? EMPTY_HIT)).toBe(false);

    // The origin the person wrote did take the secret of its own header, both times: what the
    // hop lacks is what the guard removed on leaving, not what was never there.
    await expect.poll(() => server.opens.length).toBe(2);
    expect(server.opens.map((hit) => hit.headers['x-api-key'])).toEqual([secret, secret]);

    // The hops are told in the card of the network figure, which rests open under the pointer.
    await page.locator('[data-part="response-network"]').hover();
    await expect(page.getByText('Headers removed: X-Api-Key')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Redirects' })).toBeVisible();
});

test('a dynamic import becomes no request and the send goes out', async () => {
    const echoes = server.echoes.length;

    await openItem(page, ATTACK.requests.dynamicImport);
    await sendApproved(page, 1);

    // The import never became a request: evil saw nothing of it, and the send the person wrote
    // was answered by its own origin, both times — the script that holds it ends well.
    expect(server.evilHits.filter((hit) => hit.url.includes(ATTACK.importedPath))).toEqual([]);
    await expect.poll(() => server.echoes.length).toBe(echoes + 2);
    expect(await markPlanted()).toBe(false);
    // The line of the script is the proof it ran: the import was tried, and refused.
    await inConsole(page, async () => {
        await expect(
            consolePanel(page)
                .getByText(/^att-import:/u)
                .first(),
        ).toBeVisible();
        await expect(consolePanel(page).getByText('att-import:loaded')).toHaveCount(0);
    });
});

test('a never-ending script is cut and the window answers all along', async () => {
    await openItem(page, ATTACK.requests.loop);
    await sendApproved(page, 1);

    // While the script spins, the window still answers.
    await inConsole(page, async () => {
        await expect(consolePanel(page)).toBeVisible();
    });
    await expect(page.locator('[data-part="send-status"]')).toContainText(SCRIPT_FAILED, {
        timeout: 20_000,
    });
    // A cut takes what the script wrote with it: the console names the cut and where it stopped,
    // which is the proof the loop ran — nothing else in this item spends five seconds nowhere.
    await inConsole(page, async () => {
        await expect(
            consolePanel(page)
                .getByText(/ran longer than/u)
                .first(),
        ).toBeVisible();
    });

    const echoes = server.echoes.length;

    await page.getByRole('button', { name: 'Send without scripts' }).click();
    await expect.poll(() => server.echoes.length).toBe(echoes + 1);
});

test('a memory bomb dies inside the worker and the next send still works', async () => {
    const hopHits = () => server.evilHits.filter((hit) => hit.url.includes(ATTACK.hopPath)).length;
    const hops = hopHits();

    await openItem(page, ATTACK.requests.bomb);
    await sendApproved(page, 1);
    // The bomb kills its worker mid-run, logs included: the failure named is the proof it ran.
    await expect(page.locator('[data-part="send-status"]')).toContainText(SCRIPT_FAILED, {
        timeout: 30_000,
    });

    await openItem(page, ATTACK.requests.redirect);
    await send(page);
    await expect.poll(hopHits).toBeGreaterThan(hops);
});

test('trojan source arrives as text that waits, shown for what it is', async () => {
    await openItem(page, ATTACK.requests.trojan);
    await openSection(page, 'Scripts');
    await openSection(page, 'Before the request');

    await expect(page.getByText(BAND)).toBeVisible();

    // The hiding line wraps past the height of a small window, so the editor draws the line after
    // it only once the caret goes there, the way a person reading to the end does.
    const lines = editorLines(page, 'event-script').filter({ visible: true }).first();

    await lines.click();
    await page.keyboard.press('Control+End');
    await expect(lines).toContainText(ATTACK.marks.trojan);

    const hits = server.evilHits.length;

    await send(page);
    await expect(page.getByText('Sent without 1 unapproved script')).toBeVisible();
    // The only thing that ran out is the collection script the person had already approved; the
    // trojan text, unapproved, stayed what it is: text.
    expect(server.evilHits.length).toBe(hits + 1);
    expect(server.evilHits.at(-1)?.url).toContain(ATTACK.sentPath);
});

test('a pull that rewrites an approved script asks again', async () => {
    const file = await itemFile(await hostileRepoRoot(sandbox), 'Payments', [
        'Pedidos',
        'atacar',
        ATTACK.requests.steal,
    ]);
    const text = await readFile(file, 'utf8');

    await writeFile(file, text.replace(ATTACK.marks.steal, 'attack-steal-two'), 'utf8');
    await bringToFront(app);

    await openItem(page, ATTACK.requests.steal);
    await openSection(page, 'Scripts');
    await openSection(page, 'Before the request');
    await expect(editorLines(page, 'event-script').filter({ visible: true })).toContainText(
        'attack-steal-two',
    );
    await expect(page.getByText(BAND)).toBeVisible();

    const echoes = server.echoes.length;

    await send(page);
    await expect(page.getByText('Sent without 1 unapproved script')).toBeVisible();
    await expect.poll(() => server.echoes.length).toBe(echoes + 1);
});

test('switched off, nothing runs and the console counts every script', async () => {
    const hits = server.evilHits.length;

    await switchScripts(page, false);
    await openItem(page, ATTACK.requests.steal);

    const echoes = server.echoes.length;

    await send(page);
    await expect.poll(() => server.echoes.length).toBe(echoes + 1);
    await inConsole(page, async () => {
        await expect(consolePanel(page).getByText('Scripts are off: 3 did not run')).toBeVisible();
    });
    expect(server.evilHits.length).toBe(hits);
    await switchScripts(page, true);
});

test('the window never holds the value of the secret', async () => {
    // Nothing under a global of the window, and no spelling of it in what the window shows.
    expect(await secretInWindow(page, secret)).toEqual({ held: [], shown: [] });
});
