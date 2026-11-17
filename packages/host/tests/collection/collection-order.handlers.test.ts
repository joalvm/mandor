import { status } from '@mandor/git';
import { describe, expect, it } from 'vitest';

import { lastFiles, lastSubject } from '../support/repo-history.js';
import { mountedWorkspace, WORKSPACE } from './support/mounted-workspace.js';

const { create, move, repo, reorder, tree } = mountedWorkspace();

const FOLDER = 'workspaces/api-de-pagos/collections/pedidos/collection.yaml';

/** Everything git has to say about the working tree, no matter which side of the index it is on. */
async function changedFiles(): Promise<string[]> {
    const pending = await status(repo());

    return [...pending.staged, ...pending.unstaged, ...pending.untracked].sort();
}

/** The path main drew for what a create call made, which is the path it answered with. */
async function created(payload: unknown): Promise<string> {
    const made = await create(payload);

    return made.ok ? made.value : '';
}

async function pathsOfTree(): Promise<unknown> {
    const answer = await tree(WORKSPACE);

    return answer.ok && answer.value.map((node) => node.path);
}

describe('reordering siblings from the renderer', () => {
    it('rewrites the order of the folder that holds them and nothing else', async () => {
        await expect(
            reorder({
                ...WORKSPACE,
                parent: 'pedidos',
                name: 'pedido-pagado',
                before: 'pedido-creado',
            }),
        ).resolves.toEqual({ ok: true, value: {} });

        await expect(changedFiles()).resolves.toEqual([FOLDER]);
    });

    it('leaves the siblings in the order it was asked for', async () => {
        await reorder({
            ...WORKSPACE,
            parent: 'pedidos',
            name: 'pedido-pagado',
            before: 'pedido-creado',
        });

        const answer = await tree(WORKSPACE);
        const folder = answer.ok ? answer.value[0] : undefined;

        expect(folder?.kind === 'collection' && folder.children.map((child) => child.path)).toEqual(
            ['pedidos/pedido-pagado', 'pedidos/pedido-creado'],
        );
    });

    it('sends the node to the end of the order when nothing goes after it', async () => {
        await reorder({ ...WORKSPACE, parent: '', name: 'pedidos', before: null });

        await expect(pathsOfTree()).resolves.toEqual(['pedidos']);
    });

    it('refuses a request that names no sibling to arrange', async () => {
        await expect(reorder({ ...WORKSPACE, parent: 'pedidos' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });
});

describe('moving a node between folders from the renderer', () => {
    /** Two orders and the file itself: the item is carried, never rewritten. */
    it('commits the two folders it travels between and the file it moves, in the act', async () => {
        const ayer = await created({ ...WORKSPACE, parent: 'pedidos', name: 'Ayer' });

        await expect(
            move({
                ...WORKSPACE,
                from: 'pedidos/pedido-creado',
                kind: 'item',
                to: `${ayer}/pedido-creado`,
            }),
        ).resolves.toEqual({ ok: true, value: {} });

        await expect(changedFiles()).resolves.toEqual([]);
        await expect(lastSubject(repo())).resolves.toBe('move item Pedido creado to Ayer');
        await expect(lastFiles(repo())).resolves.toEqual(
            [
                FOLDER,
                `workspaces/api-de-pagos/collections/${ayer}/folder.yaml`,
                `workspaces/api-de-pagos/collections/${ayer}/pedido-creado.yaml`,
                'workspaces/api-de-pagos/collections/pedidos/pedido-creado.yaml',
            ].sort(),
        );
    });

    it('refuses an item that would land at the top level, where only collections live', async () => {
        await expect(
            move({
                ...WORKSPACE,
                from: 'pedidos/pedido-creado',
                kind: 'item',
                to: 'pedido-creado',
            }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    it('names a moved folder as a folder in the history', async () => {
        await move({ ...WORKSPACE, from: 'pedidos', kind: 'folder', to: 'pendientes' });

        await expect(lastSubject(repo())).resolves.toBe('move folder Pedidos to API de pagos');
    });

    it('carries a folder with everything under it', async () => {
        await move({ ...WORKSPACE, from: 'pedidos', kind: 'folder', to: 'pendientes' });

        await expect(pathsOfTree()).resolves.toEqual(['pendientes']);
    });

    /** The name is the identity, so a taken one is a refusal the interface can word, not a crash. */
    it('answers with its own code when the name is taken', async () => {
        await expect(
            move({
                ...WORKSPACE,
                from: 'pedidos/pedido-creado',
                kind: 'item',
                to: 'pedidos/pedido-pagado',
            }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'name-taken' } });
    });

    it('refuses a path that walks out of the workspace', async () => {
        await expect(
            move({ ...WORKSPACE, from: 'pedidos/pedido-creado', kind: 'item', to: '../../fuera' }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });
});
