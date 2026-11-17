import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { collectionDir, listConflicts } from '@mandor/store-fs';
import { describe, expect, it } from 'vitest';

import { flushAllCommits } from '../../src/repo/commit-scheduler.js';
import { lastSubject } from '../support/repo-history.js';
import { mountedWorkspace, WORKSPACE } from './support/mounted-workspace.js';

const { readItem, renameItem, repo, writeItem } = mountedWorkspace();

const PEDIDO = { ...WORKSPACE, path: 'pedidos/pedido-creado' };
const STALE = { kind: 'message', name: 'Pedido creado', tags: ['pagos'] };

function file(path: string): string {
    return join(collectionDir(repo(), WORKSPACE.workspaceId), `${path}.yaml`);
}

describe('saving an item under a name the file no longer has', () => {
    /** The tab that renamed the item still holds the old name in the request it has open. */
    it('keeps the name a rename gave when the save carries the old one', async () => {
        await readItem(PEDIDO);
        await renameItem({ ...PEDIDO, name: 'Pedido abierto' });

        await writeItem({ ...PEDIDO, fields: STALE });

        const written = await readFile(file(PEDIDO.path), 'utf8');

        expect(written).toContain('name: Pedido abierto');
        expect(written).not.toContain('Pedido creado');
        expect(written).toContain('pagos');
    });

    it('commits the save under the name the file has', async () => {
        await readItem(PEDIDO);
        await renameItem({ ...PEDIDO, name: 'Pedido abierto' });
        await writeItem({ ...PEDIDO, fields: STALE });
        await flushAllCommits();

        await expect(lastSubject(repo())).resolves.toBe('update item Pedido abierto');
    });

    it('keeps the name a colleague gave when the file changed under the window', async () => {
        await readItem(PEDIDO);
        await writeFile(
            file(PEDIDO.path),
            'kind: message\nname: Pedido de ellos\nchannel: pedidos.creado\n',
        );

        await writeItem({ ...PEDIDO, fields: STALE });

        const written = await readFile(file(PEDIDO.path), 'utf8');

        expect(written).toContain('name: Pedido de ellos');
        expect(written).toContain('channel: pedidos.creado');
        expect(written).toContain('pagos');
        expect((await listConflicts(repo())).conflicts).toEqual([]);
    });

    it('names a file that was not there by the name the save carries', async () => {
        const nuevo = { ...WORKSPACE, path: 'pedidos/pedido-nuevo' };

        await writeItem({ ...nuevo, fields: { kind: 'message', name: 'Pedido nuevo' } });

        await expect(readFile(file(nuevo.path), 'utf8')).resolves.toContain('name: Pedido nuevo');
    });
});
