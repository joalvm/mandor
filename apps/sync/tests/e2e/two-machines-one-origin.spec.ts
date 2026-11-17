import { rm } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';

import { INTERFACE_VOCABULARY } from '../../../../packages/i18n/tests/support/interface-vocabulary.js';
import {
    editHeaderAndBody,
    pressResolve,
    pressResolveInNotice,
    statusOf,
} from './support/conflict-flow.js';
import { launch, makeSandbox } from './support/launch-app.js';
import {
    bringToFront,
    linkTo,
    LOCAL,
    makeSharedRepo,
    remoteLog,
    switchToOrigin,
    unlink,
} from './support/origin-flow.js';
import { expectPlainWords } from './support/plain-words.js';
import { expectFields } from './support/spanish-flow.js';
import {
    aChangesTheUrl,
    aWritesTheRequest,
    bGetsACopy,
    remoteItem,
    startMachine,
    URL_V2,
    type Machine,
} from './support/two-machines.js';

type Leg = (name: string) => void;

const BODY_A = '{"total":3}';
const BODY_B = '{"total":2}';

/**
 * The whole road in one run, with two windows over two copies of one origin. Every piece keeps
 * its own spec: this one lets two machines work on the same request, one of them cut off from
 * the network, and brings them back to a single answer. What the walk breaks gets fixed here:
 * this is where the seams between pieces show up. At every stop the page is read for the words
 * the interface must never say.
 */
test('two machines over one origin come back to a single answer', async () => {
    // Two windows, two syncs and a resolution in one run: the budget of the config counts one path.
    test.setTimeout(600_000);

    const started = Date.now();
    const first = await makeSandbox();
    const second = await makeSandbox();
    const machines: Machine[] = [];
    const leg = (name: string): void => {
        console.log(`two machines: ${name} ${String(Date.now() - started)} ms`);
    };

    try {
        const bare = await makeSharedRepo(first.root);

        for (const sandbox of [first, second]) {
            machines.push(await startMachine(sandbox, bare));
        }

        const [a, b] = machines as [Machine, Machine];

        await followEachOther(a, b, bare, leg);
        await clashAndResolve(a, b, bare, leg);
    } finally {
        // Whatever state the road died in, nothing of the run stays alive behind it.
        for (const machine of machines) {
            await machine.app.close();
        }

        await rm(first.root, { force: true, maxRetries: 10, recursive: true });
        await rm(second.root, { force: true, maxRetries: 10, recursive: true });
    }
});

/** First half: what one copy writes shows up in the other, and a change follows it. */
async function followEachOther(a: Machine, b: Machine, bare: string, leg: Leg): Promise<void> {
    await aWritesTheRequest(a, bare);
    leg('a writes');
    await bGetsACopy(b);
    leg('b copies');
    await aChangesTheUrl(a, b, bare);
    leg('follow');
}

/** Second half: the same request edited on both sides, the clash, its answer, and one result. */
async function clashAndResolve(a: Machine, b: Machine, bare: string, leg: Leg): Promise<void> {
    await bothEditTheSame(a, b, bare);
    leg('both edit');
    await bComesBackWithAClash(b, bare);
    leg('clash');
    await bResolvesInTheTab(b, bare);
    leg('resolve');
    await aSeesTheAnswer(a);
    leg('converge');
}

/** B loses the network and edits the header and the body; A, which has it, edits the same two. */
async function bothEditTheSame(a: Machine, b: Machine, bare: string): Promise<void> {
    await unlink(b.link);
    await editHeaderAndBody(b.page, 'app', BODY_B);
    await expect(statusOf(b.page)).toHaveText('No se pudo sincronizar');
    expect(await remoteItem(bare)).not.toContain(BODY_B);

    await editHeaderAndBody(a.page, 'tienda', BODY_A);
    await expect.poll(async () => remoteItem(bare), { timeout: 60_000 }).toContain('value: tienda');
    await expectPlainWords(b.page);
}

/** The network comes back and the window opens again: both copies changed the same, and it says so. */
async function bComesBackWithAClash(b: Machine, bare: string): Promise<void> {
    await linkTo(bare, b.link);
    await b.app.close();
    Object.assign(b, await launch(b.sandbox.userDataDir, b.sandbox.defaultRepoRoot));
    // The window opens where every machine starts; opening the origin again is what brings it up to date.
    await switchToOrigin(b.page, LOCAL, 'Equipo');

    const notice = b.page.getByText('Hay un conflicto en Crear pedido').first();

    await expect(notice).toBeVisible({ timeout: 60_000 });
    expect(await notice.innerText()).not.toMatch(INTERFACE_VOCABULARY);
    await expect(statusOf(b.page)).toHaveText('Hay conflictos');
    await expect(mark(b.page)).toBeVisible();
    // A merge nobody answered is not sent: the shared copy has A's edit and nothing of B's.
    expect(await subjectStarting(bare, 'merge changes of')).toBe(false);
    await expectPlainWords(b.page);
}

/** The notice opens the tab; the header takes the incoming value and the body keeps what B wrote. */
async function bResolvesInTheTab(b: Machine, bare: string): Promise<void> {
    await pressResolveInNotice(b.page);

    const page = b.page;

    await expect(page.getByRole('columnheader', { name: 'Lo entrante' })).toBeVisible();
    await page.getByRole('checkbox', { name: 'Marcar todo lo entrante' }).check();
    await expectPlainWords(page);
    await page.getByRole('button', { exact: true, name: 'Siguiente' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('(Body)');
    await page.getByRole('checkbox', { name: 'Marcar todo lo mío' }).check();
    await expectPlainWords(b.page);
    await pressResolve(b.page);
    await expect(statusOf(b.page)).toHaveText('Listo', { timeout: 60_000 });
    await expect(mark(b.page)).toHaveCount(0);

    await expect
        .poll(() => subjectStarting(bare, 'merge changes of'), { timeout: 60_000 })
        .toBe(true);
    await expect.poll(() => subjectStarting(bare, 'resolve conflict in')).toBe(true);

    const item = await remoteItem(bare);

    expect(item).toContain('tienda');
    expect(item).toContain(BODY_B);
    expect(item).toContain('/v2');
}

/** The dot the row of the request wears while its changes wait for an answer. */
function mark(page: Page) {
    return page
        .getByRole('treeitem', { name: 'Crear pedido' })
        .getByRole('img', { name: 'Conflicto' });
}

/** Whether the shared copy holds a commit whose subject starts so. */
async function subjectStarting(bare: string, start: string): Promise<boolean> {
    return (await remoteLog(bare)).some((line) => line.startsWith(start));
}

/** A takes the focus and finds what B wrote down, in the tab it already had open. */
async function aSeesTheAnswer(a: Machine): Promise<void> {
    await bringToFront(a.app);
    await expectFields(a.page, {
        body: BODY_B,
        header: ['X-Canal', 'tienda'],
        url: URL_V2,
    });
    await expectPlainWords(a.page);
}
