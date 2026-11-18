import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { collectionDir } from '@mandor/store-fs';
import { describe, expect, it } from 'vitest';

import { mountedWorkspace, WORKSPACE } from './support/mounted-workspace.js';

const { readItem, repo, writeItem } = mountedWorkspace();

const PEDIDO = { ...WORKSPACE, path: 'pedidos/pedido-creado' };

function fileOf(path: string): string {
    return join(collectionDir(repo(), WORKSPACE.workspaceId), `${path}.yaml`);
}

describe('reading the body of one item', () => {
    /** The envelope and the keys of the kind arrive flat, exactly as the file has them. */
    it('answers with the envelope and the body at the same level', async () => {
        await expect(readItem(PEDIDO)).resolves.toEqual({
            ok: true,
            value: { kind: 'message', name: 'Pedido creado' },
        });
    });

    it('refuses a path that climbs out of the collection', async () => {
        await expect(
            readItem({ ...WORKSPACE, path: '../../../etc/passwd' }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    it('answers with its own code when there is no such item', async () => {
        await expect(readItem({ ...WORKSPACE, path: 'pedidos/no-existe' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'fs-read' },
        });
    });
});

describe('writing the body of one item', () => {
    it('leaves the keys of the kind in the file', async () => {
        await writeItem({
            ...PEDIDO,
            fields: {
                kind: 'message',
                name: 'Pedido creado',
                channel: 'pedidos.creado',
                payload: '{ "id": "{{pedidoId}}" }',
                payloadType: 'json',
            },
        });

        const written = await readFile(fileOf(PEDIDO.path), 'utf8');

        expect(written).toContain('channel: pedidos.creado');
        expect(written).toContain('{{pedidoId}}');
    });

    it('refuses a body with no kind to file it under', async () => {
        await expect(
            writeItem({ ...PEDIDO, fields: { name: 'Pedido creado' } }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });
});
