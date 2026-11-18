// The first leg of the road of two machines and what both legs share: two machines over one shared repo.

import { join } from 'node:path';

import { expect, type ElectronApplication, type Page } from '@playwright/test';

import {
    bareTree,
    itemNamed,
    workspaceNamed,
} from '../../../../../tools/workspace/disk-by-name.mjs';
import { launch, type Sandbox } from './launch-app.js';
import {
    addOrigin,
    bringToFront,
    linkTo,
    LOCAL,
    remoteLog,
    switchToOrigin,
} from './origin-flow.js';
import { expectPlainWords } from './plain-words.js';
import { statusOf } from './conflict-flow.js';
import {
    createNamedRequest,
    createWorkspaceIn,
    expectFields,
    openNamedRequest,
    speakSpanish,
    writeFields,
    writeUrl,
    type RequestFields,
} from './spanish-flow.js';

/**
 * The request as the shared copy has it, found by the names it goes by; `''` while the copy
 * does not hold it yet, which is what a poll waits out.
 */
export async function remoteItem(bare: string): Promise<string> {
    const tree = bareTree(bare);
    const workspace = await workspaceNamed(tree, 'Tienda');
    const file =
        workspace === null
            ? null
            : await itemNamed(tree, `${workspace}/collections`, ['pedidos', 'Crear pedido']);

    return file === null ? '' : tree.read(file).catch(() => '');
}

export const URL_V2 = 'https://api.tienda.test/pedidos/v2';

const FIELDS: RequestFields = {
    body: '{"total":1}',
    header: ['X-Canal', 'web'],
    url: 'https://api.tienda.test/pedidos',
};

/** One machine: its sandbox, the link it reaches the shared repo by, and the window it runs. */
export type Machine = {
    app: ElectronApplication;
    link: string;
    page: Page;
    sandbox: Sandbox;
    url: string;
};

/** A window over a machine of its own, speaking Spanish, with a link of its own to the repo. */
export async function startMachine(sandbox: Sandbox, bare: string): Promise<Machine> {
    const link = join(sandbox.root, 'link');
    const url = await linkTo(bare, link);
    const { app, page } = await launch(sandbox.userDataDir, sandbox.defaultRepoRoot);

    await expect(page.getByRole('button', { exact: true, name: 'Personal' })).toBeVisible();
    await speakSpanish(page);

    return { app, link, page, sandbox, url };
}

/** A adds the origin that has nothing yet, and puts a workspace and a request in it. */
export async function aWritesTheRequest({ page, url }: Machine, bare: string): Promise<void> {
    await addOrigin(page, { name: 'Equipo', url });
    await expectPlainWords(page);
    await switchToOrigin(page, LOCAL, 'Equipo');

    await createWorkspaceIn(page, 'Sin workspace', 'Tienda');
    await createNamedRequest(page, 'pedidos', 'Crear pedido');
    await writeFields(page, FIELDS);
    await expectPlainWords(page);

    await expect.poll(async () => remoteItem(bare), { timeout: 60_000 }).toContain('X-Canal');
    expect((await remoteLog(bare)).some((line) => line.startsWith('create item'))).toBe(true);
}

/** B adds the same origin by its own link and gets a copy: the workspace and the request, as A wrote them. */
export async function bGetsACopy({ page, url }: Machine): Promise<void> {
    await addOrigin(page, { name: 'Equipo', url });
    await switchToOrigin(page, LOCAL, 'Equipo');
    // The copy brings the only workspace the origin has, already open.
    await expect(page.getByRole('button', { exact: true, name: 'Tienda' })).toBeVisible();

    await openNamedRequest(page, 'pedidos', 'Crear pedido');
    await expectFields(page, FIELDS);
    await expectPlainWords(page);
}

/** A changes the destination; B takes the focus and shows it, and both say they are in step. */
export async function aChangesTheUrl(a: Machine, b: Machine, bare: string): Promise<void> {
    await writeUrl(a.page, URL_V2);
    // "Ready" says nothing of the edit yet: what says it reached the others is the shared copy.
    await expect.poll(async () => remoteItem(bare), { timeout: 60_000 }).toContain('/v2');
    await expect(statusOf(a.page)).toHaveText('Listo');

    await bringToFront(b.app);
    await expect(b.page.getByRole('textbox', { name: 'URL' })).toContainText(URL_V2);
    await expect(statusOf(b.page)).toHaveText('Listo');
    await expectPlainWords(a.page);
    await expectPlainWords(b.page);
}
