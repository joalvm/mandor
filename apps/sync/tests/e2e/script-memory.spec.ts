import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import {
    expectBackAfterRounds,
    settledMemory,
    type ExpectNoDrift,
    type WaitUntil,
} from '../../../../packages/host/tests/support/memory-drift.js';
import { openSection } from '../../../../packages/ui/tests/support/open-section.js';
import { approveWhatWasLeftOut, openItem } from './support/attack-flow.js';
import { PERSONAL, workspaceDir } from './support/disk-names.js';
import { launch, makeSandbox, type Sandbox } from './support/launch-app.js';
import { startLocalHttpServer, type LocalHttpServer } from './support/local-http-server.js';

// skip-policy: the memory ceilings of the spike were measured on the Linux container; a hosted
// runner of another system would read its own machine as a leak.
test.skip(process.platform !== 'linux', 'the ceilings were measured on Linux');

/** The sends of a working day of scripts, and how many each round of the drift runs. */
const SENDS = 500;
const PER_ROUND = 100;
/** Chains that fill every worker at once: the `workers` of `SCRIPT_LIMITS`. */
const CHAINS = 8;
/** What one worker may weigh at its worst: its WASM `maximum` plus the heap of the script. */
const WORKER_CEILING_MB = 96;
/** Room for the readings of a window that never left its ceiling: not a budget to grow into. */
const READING_MARGIN_MB = 64;

const until: WaitUntil = (ready) => expect.poll(ready, { timeout: 60_000 }).toBe(true);
const noDrift: ExpectNoDrift = (drift) => expect.poll(drift, { timeout: 60_000 }).toEqual([]);

// A working day of sends and the peak of eight bombs in one run: the budget is of the app under
// load, not of a clock the test waits on.
test.setTimeout(10 * 60_000);

let sandbox: Sandbox;
let app: ElectronApplication;
let page: Page;
let server: LocalHttpServer;

/** The log of one level of the chain: long lines, many of them, on every send. */
const LOUD = [
    "const part = 'mem-' + 'x'.repeat(110);",
    'for (let i = 0; i < 30; i += 1) { console.log(part + " " + String(i)); }',
].join('\n');

const LOOP = 'while (true) {}';
const BOMB = ['const a = [];', 'while (true) { a.push("x".repeat(1024 * 1024)); }'].join('\n');

/** Groups of the session in their order: the day's chain, the bombs, the loops, the spare. */
function groupsOf(): { name: string; source: string }[] {
    const loops = Array.from({ length: CHAINS }, (_unused, index) => String(index + 1));

    return [
        { name: 'pedida', source: LOUD },
        ...loops.map((index) => ({ name: `bomba-${index}`, source: BOMB })),
        ...loops.map((index) => ({ name: `bucle-${index}`, source: LOOP })),
        { name: 'bucle-9', source: LOOP },
    ];
}

/**
 * The chain of the day, three levels loud, plus the requests that fill every worker: one bomb
 * per group and one loop with a spare, each its own group so every send can leave at once. The
 * session of groups is written the way the workload of the app writes its own.
 */
async function layOutTheDay(repoRoot: string, url: string): Promise<void> {
    const workspace = await workspaceDir(repoRoot, PERSONAL);
    const id = workspace.split('/').at(-1) ?? '';
    const group = join(repoRoot, workspace, 'collections', 'mem', 'carga');
    const indented = (source: string): string =>
        source
            .split('\n')
            .map((row) => `      ${row}`)
            .join('\n');
    const requestOf = (name: string, source: string): string =>
        [
            // An item on disk is flat: the envelope and the keys of the request at the same
            // level, the way the app writes its own.
            'kind: request',
            `name: ${name}`,
            'method: GET',
            `url: "${url}"`,
            'headers: []',
            'body:\n  type: none',
            `scripts:\n  onBeforeRequest:\n    source: |-\n${indented(source)}`,
            '',
        ].join('\n');

    await mkdir(group, { recursive: true });
    // The tree shows what the order of each group names: an order nobody wrote is an empty one.
    await writeFile(
        join(group, '..', 'collection.yaml'),
        `name: mem\norder:\n  - carga\nheaders: []\nscripts:\n  onBeforeRequest:\n    source: |-\n${indented(LOUD)}`,
        'utf8',
    );
    await writeFile(
        join(group, 'folder.yaml'),
        `name: carga\norder:\n${groupsOf()
            .map(({ name }) => `  - ${name}`)
            .join('\n')}\nscripts:\n  onBeforeRequest:\n    source: |-\n${indented(LOUD)}`,
        'utf8',
    );
    await writeFile(join(group, 'pedida.yaml'), requestOf('pedida', LOUD), 'utf8');

    for (const { name, source } of groupsOf().slice(1)) {
        await writeFile(join(group, `${name}.yaml`), requestOf(name, source), 'utf8');
    }

    // One group, every request a tab of its own: the Send of the moment answers for whichever
    // tab stands in front, so eight sends can leave one after the other and still be in flight.
    const tabs = groupsOf()
        .map(
            ({ name }) =>
                `    - id: item-${name}\n      kind: item\n      resource: mandor://local/${id}/item/mem/carga/${name}`,
        )
        .join('\n');

    await mkdir(join(repoRoot, '.mandor'), { recursive: true });
    await writeFile(
        join(repoRoot, '.mandor', 'session.yaml'),
        [
            'version: 2',
            `activeWorkspaceId: ${id}`,
            'activeGroupId: "0"',
            'grid:',
            '  kind: leaf',
            '  id: "0"',
            '  tabs:',
            tabs,
            '  activeTab: item-pedida',
            'panels:',
            '  sidebarWidth: 260',
            '  contentSplit: 50',
            '',
        ].join('\n'),
        'utf8',
    );
}

/** Puts the tab of one request in front: the Send of the group answers to it from then on. */
async function openTab(page: Page, name: string): Promise<void> {
    await page.getByRole('tab', { name: new RegExp(`${name}$`, 'u') }).click();
}

/** Sends `count` times from the tab of one request, each waited for by its count. */
async function sendFrom(page: Page, name: string, count: number): Promise<void> {
    await openTab(page, name);

    // `exact`, or the escape hatch a failed send leaves beside it answers for the button too.
    const button = page.getByRole('button', { name: 'Send', exact: true });

    for (let sent = 0; sent < count; sent += 1) {
        const expected = server.answers() + 1;

        await button.click();
        await expect
            .poll(server.answers, { intervals: [10, 25, 50], timeout: 30_000 })
            .toBe(expected);
    }
}

/** Opens the tab of a request and clicks Send once, moving on: chains of a peak overlap in flight. */
async function fire(page: Page, name: string): Promise<void> {
    await openTab(page, name);
    // A click the way a person makes it: the composer of a tab just switched to is not ready for
    // a bare event the same instant, and a send that never left reads as a leak of the day.
    await page.getByRole('button', { name: 'Send', exact: true }).click();
}

/** The resident memory of main, read where it lives: the workers are threads of it. */
function rssMb(app: ElectronApplication): Promise<number> {
    // The `process` the evaluate sees is not the one of main whole: its modules come from the
    // builtin loader, the same door `readMain` of the memory sampler goes through.
    return app.evaluate(
        () => process.getBuiltinModule('node:process').memoryUsage().rss / 1024 / 1024,
    );
}

/** The threads the service of scripts runs in: one while an editor of scripts is open. */
function scriptThreads(): number {
    return page.workers().filter((worker) => worker.url().includes('script-worker-main')).length;
}

/**
 * Opens the script of the day's request in its editor, and closes it with its tab: a section once
 * open stays mounted while the tab lives, so going to another one keeps the editor.
 */
async function openAndCloseTheScript(): Promise<void> {
    await openItem(page, 'pedida');
    await openSection(page, 'Scripts');
    await openSection(page, 'Before the request');
    await expect(
        page.locator('[data-part="event-script"] .monaco-editor').filter({ visible: true }),
    ).toHaveCount(1);
    // One thread, however many times the editor opened: a closed one never leaves its own behind.
    await expect.poll(scriptThreads).toBe(1);

    const tab = page.getByRole('tab', { name: /pedida$/u });

    // The close of a tab is only there while the pointer is on it.
    await tab.hover();
    await tab.getByRole('button', { name: 'Close tab' }).click();
    await expect(page.locator('[data-part="event-script"]')).toHaveCount(0);
}

/** Sends once so the review offers the scripts of one request, approves them, and moves on. */
async function warmTheChain(page: Page, name: string, count: number): Promise<void> {
    await fire(page, name);
    await expect(
        page.getByText(`Sent without ${String(count)} unapproved script${count === 1 ? '' : 's'}`),
    ).toBeVisible();
    await approveWhatWasLeftOut(page, count);
}

test.beforeAll(async () => {
    sandbox = await makeSandbox();
    server = await startLocalHttpServer();
    const first = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

    await expect(first.page.getByRole('button', { exact: true, name: PERSONAL })).toBeVisible();
    await first.app.close();
    await layOutTheDay(sandbox.repoRoot, `${server.origin}/answer`);
    ({ app, page } = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot));

    await expect(page.locator('.dv-groupview')).toHaveCount(1);

    // Every script the day runs needs its approval, given once: the bomb and the loop are one
    // text each, so approving one request of each approves them all.
    await warmTheChain(page, 'pedida', 3);
    await warmTheChain(page, 'bomba-1', 1);
    await warmTheChain(page, 'bucle-1', 1);
    await fire(page, 'bucle-1');
    await expect(page.locator('[data-part="send-status"]')).toContainText('A script failed', {
        timeout: 20_000,
    });
    await sendFrom(page, 'pedida', 1);
});

test.afterAll(async () => {
    await app.close();
    await server.close();
    await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
});

test('a day of sends through a loud chain leaves the window where it started', async () => {
    const move = async (): Promise<void> => {
        await sendFrom(page, 'pedida', PER_ROUND);
    };

    await expectBackAfterRounds({ app, page, until, noDrift }, move, SENDS / PER_ROUND);
});

test('eight bombs at once stay under the ceiling of their workers', async () => {
    const base = await settledMemory(app, page, until);

    for (let index = 1; index <= CHAINS; index += 1) {
        await fire(page, `bomba-${String(index)}`);
    }

    // The bombs fill their workers and die on their own: the reading walks alongside them.
    let peak = 0;
    let samples = 0;

    while (samples < 50) {
        peak = Math.max(peak, await rssMb(app));
        samples += 1;
        // timing-policy: a measurement, not a wait: sampling the resident memory of main while
        // eight bombs fill their workers, at the pace the reading itself needs.
        await page.waitForTimeout(200);
    }

    expect(peak).toBeLessThan(base.workingSetMb + CHAINS * WORKER_CEILING_MB + READING_MARGIN_MB);

    // Each bomb did run and die: a peak read while none of them ran would prove nothing.
    for (let index = 1; index <= CHAINS; index += 1) {
        await openTab(page, `bomba-${String(index)}`);
        await expect(page.locator('[data-part="send-status"]')).toContainText('A script failed', {
            timeout: 60_000,
        });
    }

    await expect
        .poll(async () => (await rssMb(app)) < base.workingSetMb + READING_MARGIN_MB, {
            timeout: 60_000,
        })
        .toBe(true);
});

test('a ninth chain waits for a worker and cancels, and main keeps up', async () => {
    await app.evaluate(() => {
        const { monitorEventLoopDelay } = process.getBuiltinModule('node:perf_hooks');
        const holder = globalThis as unknown as {
            __lag?: ReturnType<typeof monitorEventLoopDelay>;
        };

        holder.__lag = monitorEventLoopDelay({ resolution: 20 });
        holder.__lag.enable();
    });

    // Eight loops take every worker; the ninth waits for one, and the person lets it go.
    for (let index = 1; index <= CHAINS; index += 1) {
        await fire(page, `bucle-${String(index)}`);
    }

    await openTab(page, 'bucle-9');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Abort' })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Abort' }).click();
    await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeVisible({
        timeout: 20_000,
    });

    const p99 = await app.evaluate(() => {
        const holder = globalThis as unknown as {
            __lag?: { disable: () => void; percentile: (which: number) => number };
        };
        const lag = holder.__lag;

        lag?.disable();

        return (lag?.percentile(99) ?? 0) / 1e6;
    });

    expect(p99).toBeLessThanOrEqual(50);
});

/** The service weighs megabytes: a window that closed its last script carries none of them. */
test('the script service stops when no script editor is open', async () => {
    await expectBackAfterRounds({ app, page, until, noDrift }, openAndCloseTheScript, 5);
    await expect.poll(scriptThreads, { timeout: 60_000 }).toBe(0);
});
