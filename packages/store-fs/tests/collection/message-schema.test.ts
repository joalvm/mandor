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
    payload: '{"id": "{{pedidoId}}"}',
    schema: '{"type": "object", "required": ["id"], "properties": {"id": {"type": "string"}}}',
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

describe('one message with its schema on disk', () => {
    it('reads back the schema text it wrote, byte for byte', async () => {
        const item = await readItem(root, WORKSPACE, PATH);

        await writeItem(root, WORKSPACE, PATH, { ...item, body: messageItemBody(message) });

        expect(parseMessageItem(await readItem(root, WORKSPACE, PATH))).toEqual(message);
    });

    /**
     * A schema somebody emptied is a schema the message no longer has. Left on disk it would
     * come back the next time the message is opened, and the erasing would read as a bug.
     */
    it('takes the schema off the file when the message no longer carries one', async () => {
        const item = await readItem(root, WORKSPACE, PATH);

        await writeItem(root, WORKSPACE, PATH, { ...item, body: messageItemBody(message) });
        await writeItem(root, WORKSPACE, PATH, {
            ...item,
            body: messageItemBody({ ...message, schema: '' }),
        });

        expect(await readFile(itemFile(root, WORKSPACE, PATH), 'utf8')).not.toContain('schema');
    });

    it('keeps a key it does not understand through a rewrite', async () => {
        const file = itemFile(root, WORKSPACE, PATH);
        const item = await readItem(root, WORKSPACE, PATH);

        await writeFile(file, `${await readFile(file, 'utf8')}propio: se conserva\n`, 'utf8');
        await writeItem(root, WORKSPACE, PATH, { ...item, body: messageItemBody(message) });

        expect(await readFile(file, 'utf8')).toContain('propio: se conserva');
    });
});
