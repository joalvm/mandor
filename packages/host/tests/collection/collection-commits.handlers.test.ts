import { describe, expect, it } from 'vitest';

import { flushAllCommits } from '../../src/repo/commit-scheduler.js';
import {
    commitCount,
    dirtyFiles,
    lastFiles,
    lastSubject,
    subjects,
} from '../support/repo-history.js';
import { mountedWorkspace, WORKSPACE } from './support/mounted-workspace.js';

const { create, move, remove, renameFolder, renameItem, reorder, repo, writeItem } =
    mountedWorkspace();

const COLLECTION = 'workspaces/api-de-pagos/collections';

/** The id main drew for what a create call made, which is the path it answered with. */
async function created(payload: unknown): Promise<string> {
    const made = await create(payload);

    return made.ok ? made.value : '';
}

const PEDIDO = { ...WORKSPACE, path: 'pedidos/pedido-creado' };
const BODY = { kind: 'message', name: 'Pedido creado', channel: 'pedidos.creado' };

describe('what a change of structure of the collection leaves in the history', () => {
    it('commits a new folder with the order it joined', async () => {
        const id = await created({ ...WORKSPACE, parent: '', name: 'Envíos' });

        await expect(lastSubject(repo())).resolves.toBe('create folder Envíos');
        await expect(lastFiles(repo())).resolves.toEqual(
            [`${COLLECTION}/collections.yaml`, `${COLLECTION}/${id}/collection.yaml`].sort(),
        );
        await expect(dirtyFiles(repo())).resolves.toEqual([]);
    });

    it('commits a new item with the order of its folder', async () => {
        await create({
            ...WORKSPACE,
            parent: 'pedidos',
            name: 'Pedido anulado',
            itemKind: 'message',
        });

        await expect(lastSubject(repo())).resolves.toBe('create item Pedido anulado');
        await expect(dirtyFiles(repo())).resolves.toEqual([]);
    });

    it('commits the rename of an item as the one file that holds its name', async () => {
        await renameItem({ ...PEDIDO, name: 'Pedido abierto' });

        await expect(lastSubject(repo())).resolves.toBe('rename item Pedido abierto');
        await expect(lastFiles(repo())).resolves.toEqual([
            `${COLLECTION}/pedidos/pedido-creado.yaml`,
        ]);
        await expect(dirtyFiles(repo())).resolves.toEqual([]);
    });

    it('commits the rename of a folder as the one file that holds its name', async () => {
        await renameFolder({ ...WORKSPACE, path: 'pedidos', name: 'Pendientes' });

        await expect(lastSubject(repo())).resolves.toBe('rename folder Pendientes');
        await expect(lastFiles(repo())).resolves.toEqual([`${COLLECTION}/pedidos/collection.yaml`]);
        await expect(dirtyFiles(repo())).resolves.toEqual([]);
    });

    it('commits a deleted item as an item and a deleted folder as a folder', async () => {
        await remove(PEDIDO);
        await expect(lastSubject(repo())).resolves.toBe('delete item Pedido creado');

        await remove({ ...WORKSPACE, path: 'pedidos' });
        await expect(lastSubject(repo())).resolves.toBe('delete folder Pedidos');
        await expect(dirtyFiles(repo())).resolves.toEqual([]);
    });

    it('commits nothing when the change was refused', async () => {
        const before = await commitCount(repo());

        await move({ ...WORKSPACE, from: PEDIDO.path, kind: 'item', to: 'pedidos/pedido-pagado' });

        await expect(commitCount(repo())).resolves.toBe(before);
    });
});

describe('what an edit of the collection leaves in the history', () => {
    it('waits for the calm and then commits one item under its own name', async () => {
        const before = await commitCount(repo());

        await writeItem({ ...PEDIDO, fields: BODY });
        await writeItem({ ...PEDIDO, fields: { ...BODY, channel: 'pedidos.nuevo' } });

        await expect(commitCount(repo())).resolves.toBe(before);

        await flushAllCommits();

        await expect(commitCount(repo())).resolves.toBe(before + 1);
        await expect(lastSubject(repo())).resolves.toBe('update item Pedido creado');
        await expect(lastFiles(repo())).resolves.toEqual([
            `${COLLECTION}/pedidos/pedido-creado.yaml`,
        ]);
    });

    it('commits a reorder as the order file of the folder and nothing else', async () => {
        await reorder({
            ...WORKSPACE,
            parent: 'pedidos',
            name: 'pedido-pagado',
            before: 'pedido-creado',
        });
        await flushAllCommits();

        await expect(lastSubject(repo())).resolves.toBe('reorder folder Pedidos');
        await expect(lastFiles(repo())).resolves.toEqual([`${COLLECTION}/pedidos/collection.yaml`]);
    });

    it('names the workspace when what was reordered is the top of the collection', async () => {
        const id = await created({ ...WORKSPACE, parent: '', name: 'Envíos' });

        await reorder({ ...WORKSPACE, parent: '', name: id, before: 'pedidos' });
        await flushAllCommits();

        await expect(lastSubject(repo())).resolves.toBe('reorder folder API de pagos');
    });

    it('leaves a pending edit its own commit before a change of structure', async () => {
        await writeItem({ ...PEDIDO, fields: BODY });
        await create({ ...WORKSPACE, parent: '', name: 'Envíos' });

        const history = await subjects(repo());

        expect(history.slice(0, 2)).toEqual(['create folder Envíos', 'update item Pedido creado']);
    });
});
