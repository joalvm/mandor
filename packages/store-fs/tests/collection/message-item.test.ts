import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    createMessageItem,
    MESSAGE_ITEM_KIND,
    messageItemBody,
    parseMessageItem,
} from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    createCollection,
    createCollectionItem,
    createWorkspace,
    writeRepoTree,
    itemFile,
    readItem,
    writeItem,
} from '../../src/index.js';

let root: string;

const WORKSPACE = 'eventos-de-pagos';
const PATH = 'pedidos/pedido-creado';

const message = createMessageItem({
    name: 'Pedido creado',
    channel: '{{tenant}}.pedidos.creado',
    payload: '{"id":"{{pedidoId}}"}',
});

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, {
        id: 'eventos-de-pagos',
        name: 'Eventos de pagos',
        kind: 'async',
    });
    await createCollection(root, WORKSPACE, { id: 'pedidos', name: 'Pedidos' });
    await createCollectionItem(root, WORKSPACE, 'pedidos', {
        id: 'pedido-creado',
        kind: MESSAGE_ITEM_KIND,
        name: 'Pedido creado',
    });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('one message item on disk', () => {
    it('reads back the message it wrote, templates unresolved', async () => {
        const item = await readItem(root, WORKSPACE, PATH);

        await writeItem(root, WORKSPACE, PATH, { ...item, body: messageItemBody(message) });

        expect(parseMessageItem(await readItem(root, WORKSPACE, PATH))).toEqual(message);
    });

    /**
     * A channel somebody erased is a channel the message no longer has. Left on disk it would
     * come back the next time the item is opened, and the erasing would read as a bug.
     */
    it('takes the channel off the file when the message no longer has one', async () => {
        const item = await readItem(root, WORKSPACE, PATH);

        await writeItem(root, WORKSPACE, PATH, { ...item, body: messageItemBody(message) });
        await writeItem(root, WORKSPACE, PATH, {
            ...item,
            body: messageItemBody({ ...message, channel: undefined }),
        });

        expect(await readFile(itemFile(root, WORKSPACE, PATH), 'utf8')).not.toContain('channel');
    });

    it('keeps a key it does not understand through a rewrite', async () => {
        const file = itemFile(root, WORKSPACE, PATH);
        const item = await readItem(root, WORKSPACE, PATH);

        await writeFile(file, `${await readFile(file, 'utf8')}expectAck: true\n`, 'utf8');
        await writeItem(root, WORKSPACE, PATH, { ...item, body: messageItemBody(message) });

        expect(await readFile(file, 'utf8')).toContain('expectAck: true');
    });
});
