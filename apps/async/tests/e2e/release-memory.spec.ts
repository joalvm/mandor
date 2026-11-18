import { rm } from 'node:fs/promises';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import {
    expectBackAfterRounds,
    type ExpectNoDrift,
    type WaitUntil,
} from '../../../../packages/host/tests/support/memory-drift.js';
import { createConnection, expectFirstRun } from './support/first-run.js';
import { launch, makeSandbox, type Sandbox } from './support/launch-app.js';
import {
    addOrigin,
    createWorkspaceIn,
    LOCAL,
    linkTo,
    makeSharedRepo,
    switchToOrigin,
} from './support/origin-flow.js';

/**
 * What a move leaves behind, in numbers: the DOM, the listeners and the heap of the window are
 * read with `memoryAfterGc` before and after the move runs again, and must be where they were.
 */
test.describe.configure({ mode: 'serial' });

const CONNECTIONS = ['uno', 'dos', 'tres'];
const ROUNDS = 5;
const URL = 'wss://127.0.0.1:9/socket';

let sandbox: Sandbox;
let app: ElectronApplication;
let page: Page;

const until: WaitUntil = (ready) => expect.poll(ready).toBe(true);
const noDrift: ExpectNoDrift = (drift) => expect.poll(drift).toEqual([]);

async function closeTab(name: string): Promise<void> {
    const tab = page.getByRole('tab', { name, exact: true });

    await tab.click();
    await tab.getByRole('button', { name: 'Close tab' }).click();
    await expect(tab).toHaveCount(0);
}

/** Opens the connection from the collection and closes its tab: the last view of it is gone. */
async function visit(name: string): Promise<void> {
    await page.getByRole('option', { exact: true, name }).click();
    await expect(page.getByRole('tab', { exact: true, name })).toBeVisible();
    await closeTab(name);
}

async function visitAll(): Promise<void> {
    for (const name of CONNECTIONS) {
        await visit(name);
    }
}

/** The connections the sidebar lists, exactly those: the origin in use is drawn whole. */
async function expectConnectionsListed(names: readonly string[]): Promise<void> {
    for (const name of CONNECTIONS) {
        await expect(page.getByRole('option', { exact: true, name })).toHaveCount(
            names.includes(name) ? 1 : 0,
        );
    }
}

async function expectNoGrowth(move: () => Promise<void>): Promise<void> {
    await expectBackAfterRounds({ app, page, until, noDrift }, move, ROUNDS);
}

test.beforeAll(async () => {
    sandbox = await makeSandbox();
    ({ app, page } = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot));
    await expectFirstRun(page);

    for (const name of CONNECTIONS) {
        await createConnection(page, name, URL, sandbox.repoRoot);
        await closeTab(name);
    }
});

test.afterAll(async () => {
    await app.close();
    await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
});

test('closing the last tab of a connection lets go of what it loaded', async () => {
    await expectNoGrowth(visitAll);
});

test('leaving an origin and coming back leaves the window where it was', async () => {
    const bare = await makeSharedRepo(sandbox.root);
    const url = await linkTo(bare, `${sandbox.root}/link`);

    await addOrigin(page, { name: 'Team', url });
    // The title changes before the workspace of the origin is drawn: a move that ends on the
    // title alone lets one reading see the connections of the origin and the next one not yet.
    await expectNoGrowth(async () => {
        await switchToOrigin(page, LOCAL, 'Team');
        await expectConnectionsListed([]);
        await switchToOrigin(page, 'Team', LOCAL);
        await expectConnectionsListed(CONNECTIONS);
    });
});

test('switching workspace and back leaves the window where it was', async () => {
    await createWorkspaceIn(page, 'Personal', 'Shop');
    await expectNoGrowth(async () => {
        await page.getByRole('button', { exact: true, name: 'Shop' }).click();
        await page.getByRole('menuitem', { name: 'Personal' }).click();
        await expect(page.getByRole('button', { exact: true, name: 'Personal' })).toBeVisible();
        await page.getByRole('button', { exact: true, name: 'Personal' }).click();
        await page.getByRole('menuitem', { name: 'Shop' }).click();
        await expect(page.getByRole('button', { exact: true, name: 'Shop' })).toBeVisible();
    });
});
