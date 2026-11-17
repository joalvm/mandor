import { rm } from 'node:fs/promises';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import {
    expectBackAfterRounds,
    type ExpectNoDrift,
    type WaitUntil,
} from '../../../../packages/host/tests/support/memory-drift.js';
import { launch, makeSandbox, type Sandbox } from './support/launch-app.js';
import { startLocalHttpServer, type LocalHttpServer } from './support/local-http-server.js';
import { addOrigin, LOCAL, linkTo, makeSharedRepo, switchToOrigin } from './support/origin-flow.js';
import { nameNewRequest, responseOf } from './support/send-flow.js';
import { createWorkspaceIn, speakSpanish } from './support/spanish-flow.js';

/**
 * What a move leaves behind, in numbers: the DOM, the listeners and the heap of the window are
 * read with `memoryAfterGc` before and after the move runs again, and must be where they were.
 */
test.describe.configure({ mode: 'serial' });

const REQUESTS = ['uno', 'dos', 'tres'];
const ROUNDS = 5;

let sandbox: Sandbox;
let server: LocalHttpServer;
let app: ElectronApplication;
let page: Page;

const until: WaitUntil = (ready) => expect.poll(ready).toBe(true);
const noDrift: ExpectNoDrift = (drift) => expect.poll(drift).toEqual([]);

/** One request, made the way the user makes it: a folder of its own, the entry named in the tree. */
async function createRequest(name: string): Promise<void> {
    await page.getByRole('button', { name: 'New collection' }).click();
    await page.getByRole('textbox', { name: 'New name' }).fill(`carpeta ${name}`);
    await page.getByRole('textbox', { name: 'New name' }).press('Enter');

    const folder = page.getByRole('treeitem', { name: `carpeta ${name}` });

    await folder.getByRole('button', { name: 'Row options' }).click();
    await page.getByRole('menuitem', { name: 'New request' }).click();
    await nameNewRequest(page, name);
    await expect(page.getByRole('treeitem', { exact: true, name })).toBeVisible();
}

/** Opens the request, sends it so its answer weighs, and closes its tab: the last view is gone. */
async function visit(name: string): Promise<void> {
    const tab = page.getByRole('tab', { name });

    await page.getByRole('treeitem', { exact: true, name }).click();
    await expect(tab).toBeVisible();

    const url = page.getByRole('textbox', { name: 'URL' });

    await url.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.insertText(`${server.origin}/echo`);
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(responseOf(page).locator('[data-part="response-status"]')).toHaveText('200');
    // The draft nobody saved holds the end of the tab: the close is uncovered by pointing at it.
    await tab.hover();
    await tab.getByRole('button', { name: 'Close tab' }).click();

    // The close asks about that draft, and letting it go is what releases what the tab loaded.
    const question = page.getByRole('alertdialog', { name: `Save the changes to “${name}”?` });

    await question.getByRole('button', { exact: true, name: "Don't save" }).click();
    await expect(question).toHaveCount(0);
    await expect(tab).toHaveCount(0);
}

async function visitAll(): Promise<void> {
    for (const name of REQUESTS) {
        await visit(name);
    }
}

/** The folders the tree shows, exactly those: the origin in use is drawn whole. */
async function expectFoldersListed(names: readonly string[]): Promise<void> {
    for (const name of REQUESTS) {
        await expect(page.getByRole('treeitem', { name: `carpeta ${name}` })).toHaveCount(
            names.includes(name) ? 1 : 0,
        );
    }
}

async function expectNoGrowth(move: () => Promise<void>): Promise<void> {
    await expectBackAfterRounds({ app, page, until, noDrift }, move, ROUNDS);
}

test.beforeAll(async () => {
    sandbox = await makeSandbox();
    server = await startLocalHttpServer();
    ({ app, page } = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot));
    await expect(page.getByRole('button', { exact: true, name: 'Personal' })).toBeVisible();

    for (const name of REQUESTS) {
        await createRequest(name);
    }
});

test.afterAll(async () => {
    await app.close();
    await server.close();
    await rm(sandbox.root, { force: true, maxRetries: 10, recursive: true });
});

test('closing the last tab of a request lets go of what it loaded', async () => {
    await expectNoGrowth(visitAll);
});

test('leaving an origin and coming back leaves the window where it was', async () => {
    const bare = await makeSharedRepo(sandbox.root);
    const url = await linkTo(bare, `${sandbox.root}/link`);

    await speakSpanish(page);
    await addOrigin(page, { name: 'Equipo', url });
    // The title changes before the workspace of the origin is drawn: a move that ends on the
    // title alone lets one reading see the collections of the origin and the next one not yet.
    await expectNoGrowth(async () => {
        await switchToOrigin(page, LOCAL, 'Equipo');
        await expectFoldersListed([]);
        await switchToOrigin(page, 'Equipo', LOCAL);
        await expectFoldersListed(REQUESTS);
    });
});

test('switching workspace and back leaves the window where it was', async () => {
    await createWorkspaceIn(page, 'Personal', 'Tienda');
    await expectNoGrowth(async () => {
        await page.getByRole('button', { exact: true, name: 'Tienda' }).click();
        await page.getByRole('menuitem', { name: 'Personal' }).click();
        await expect(page.getByRole('button', { exact: true, name: 'Personal' })).toBeVisible();
        await page.getByRole('button', { exact: true, name: 'Personal' }).click();
        await page.getByRole('menuitem', { name: 'Tienda' }).click();
        await expect(page.getByRole('button', { exact: true, name: 'Tienda' })).toBeVisible();
    });
});
