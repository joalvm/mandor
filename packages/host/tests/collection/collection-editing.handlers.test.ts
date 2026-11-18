import { describe, expect, it } from 'vitest';

import { mountedWorkspace, WORKSPACE } from './support/mounted-workspace.js';

const { create, remove, renameFolder, renameItem, tree } = mountedWorkspace();

/** What main draws for a node: twelve characters of the id alphabet, never a slug of the name. */
const MINTED = /^[0-9a-z]{12}$/;

describe('renaming a folder from the renderer', () => {
    it('answers nothing, because the folder keeps the path it has', async () => {
        await expect(
            renameFolder({ ...WORKSPACE, path: 'pedidos', name: 'Pedidos del día' }),
        ).resolves.toEqual({ ok: true, value: {} });
    });

    it('refuses a name that is not a name', async () => {
        await expect(
            renameFolder({ ...WORKSPACE, path: 'pedidos', name: '' }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });
});

describe('renaming an item from the renderer', () => {
    it('answers nothing, because the item keeps the path it has', async () => {
        await expect(
            renameItem({ ...WORKSPACE, path: 'pedidos/pedido-creado', name: 'Pedido abierto' }),
        ).resolves.toEqual({ ok: true, value: {} });
    });

    it('takes a name a sibling already has, as the id tells them apart', async () => {
        await expect(
            renameItem({ ...WORKSPACE, path: 'pedidos/pedido-creado', name: 'Pedido pagado' }),
        ).resolves.toEqual({ ok: true, value: {} });
    });
});

describe('creating from the renderer', () => {
    it('makes a folder at the top level under a minted id when no kind of leaf is named', async () => {
        const made = await create({ ...WORKSPACE, parent: '', name: 'Envíos' });

        expect(made.ok && made.value).toMatch(MINTED);

        const answer = await tree(WORKSPACE);

        expect(answer.ok && answer.value.map((node) => node.kind)).toEqual([
            'collection',
            'collection',
        ]);
    });

    it('makes an item of the kind it was given, inside the folder it was given', async () => {
        const made = await create({
            ...WORKSPACE,
            parent: 'pedidos',
            name: 'Pedido anulado',
            itemKind: 'message',
        });

        expect(made.ok && made.value).toMatch(/^pedidos\/[0-9a-z]{12}$/);
    });

    it('makes a second folder of a name another folder already has', async () => {
        const made = await create({ ...WORKSPACE, parent: '', name: 'Pedidos' });

        expect(made.ok && made.value).toMatch(MINTED);
    });

    it('refuses a parent that walks out of the workspace', async () => {
        await expect(
            create({ ...WORKSPACE, parent: '../../fuera', name: 'Envíos' }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });
});

describe('deleting from the renderer', () => {
    it('takes the folder and everything under it', async () => {
        await expect(remove({ ...WORKSPACE, path: 'pedidos' })).resolves.toEqual({
            ok: true,
            value: {},
        });

        const answer = await tree(WORKSPACE);

        expect(answer.ok && answer.value).toEqual([]);
    });

    it('refuses a path that walks out of the workspace', async () => {
        await expect(remove({ ...WORKSPACE, path: '../../fuera' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });
});
