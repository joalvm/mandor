import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { collectionDir, listConflicts } from '@mandor/store-fs';
import { describe, expect, it } from 'vitest';

import { mountedWorkspace, WORKSPACE } from './support/mounted-workspace.js';

const { readItem, repo, writeItem } = mountedWorkspace();

const PEDIDO = { ...WORKSPACE, path: 'pedidos/pedido-creado' };
const FIELDS = { kind: 'message', name: 'Pedido creado' };

function file(): string {
    return join(collectionDir(repo(), WORKSPACE.workspaceId), `${PEDIDO.path}.yaml`);
}

describe('writing an item the window read before the file changed', () => {
    /** The colleague's change arrived by the origin while the tab was open. */
    it('keeps their change in a field the window did not touch', async () => {
        await readItem(PEDIDO);
        await writeFile(file(), 'kind: message\nname: Pedido creado\nchannel: pedidos.creado\n');

        await writeItem({ ...PEDIDO, fields: { ...FIELDS, tags: ['pagos'] } });

        const written = await readFile(file(), 'utf8');

        expect(written).toContain('channel: pedidos.creado');
        expect(written).toContain('pagos');
        expect((await listConflicts(repo())).conflicts).toEqual([]);
    });

    it('keeps the window version and records the clash on the same field', async () => {
        await readItem(PEDIDO);
        await writeFile(file(), 'kind: message\nname: Pedido creado\nchannel: pedidos.de-ellos\n');

        await writeItem({ ...PEDIDO, fields: { ...FIELDS, channel: 'pedidos.mio' } });

        const { conflicts } = await listConflicts(repo());

        expect(await readFile(file(), 'utf8')).toContain('channel: pedidos.mio');
        expect(conflicts).toHaveLength(1);
        expect(conflicts[0]?.record).toMatchObject({
            source: 'write',
            base: 'kind: message\nname: Pedido creado\n',
            theirs: 'kind: message\nname: Pedido creado\nchannel: pedidos.de-ellos\n',
        });
    });

    it('writes as always when the window never read the item', async () => {
        await writeFile(file(), 'kind: message\nname: Pedido creado\nchannel: pedidos.de-ellos\n');

        await writeItem({ ...PEDIDO, fields: { ...FIELDS, channel: 'pedidos.mio' } });

        expect(await readFile(file(), 'utf8')).toContain('channel: pedidos.mio');
        expect((await listConflicts(repo())).conflicts).toEqual([]);
    });
});
