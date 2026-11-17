import { describe, expect, it } from 'vitest';

import {
    collectionCreateRequestSchema,
    collectionCreateResultSchema,
} from '../../src/collection/collection-create.js';
import { collectionDeleteRequestSchema } from '../../src/collection/collection-delete.js';
import { collectionReadItemRequestSchema } from '../../src/collection/collection-read-item.js';
import { collectionRenameRequestSchema } from '../../src/collection/collection-rename.js';
import {
    collectionTreeRequestSchema,
    collectionTreeResultSchema,
} from '../../src/collection/collection-tree.js';
import { collectionWriteItemRequestSchema } from '../../src/collection/collection-write-item.js';

const WORKSPACE = { workspaceId: 'pagos', path: 'pedidos/crear' };

describe('the payloads of the collection channels', () => {
    it('collection-tree asks for one workspace and answers its nodes', () => {
        expect(collectionTreeRequestSchema.parse({ workspaceId: 'pagos' })).toEqual({
            workspaceId: 'pagos',
        });
        expect(collectionTreeResultSchema.parse({ ok: true, value: [] })).toEqual({
            ok: true,
            value: [],
        });
    });

    it('collection-create makes a folder when no kind travels, and answers its path', () => {
        const folder = { workspaceId: 'pagos', parent: '', name: 'Pedidos' };

        expect(collectionCreateRequestSchema.parse(folder)).toEqual(folder);
        expect(collectionCreateResultSchema.parse({ ok: true, value: 'pedidos' })).toEqual({
            ok: true,
            value: 'pedidos',
        });
    });

    it('collection-create makes a leaf of the kind it names, under a folder', () => {
        const item = {
            workspaceId: 'pagos',
            parent: 'pedidos',
            name: 'Crear',
            itemKind: 'message',
        };

        expect(collectionCreateRequestSchema.parse(item)).toEqual(item);
    });

    it('collection-rename carries the new name beside the path that stays', () => {
        const rename = { ...WORKSPACE, name: 'Crear pedido' };

        expect(collectionRenameRequestSchema.parse(rename)).toEqual(rename);
        expect(collectionRenameRequestSchema.safeParse({ ...WORKSPACE, name: '' }).success).toBe(
            false,
        );
    });

    it('collection-delete takes the workspace and the path that stops existing', () => {
        expect(collectionDeleteRequestSchema.parse(WORKSPACE)).toEqual(WORKSPACE);
    });

    it('collection-read-item reads one item by its path', () => {
        expect(collectionReadItemRequestSchema.parse(WORKSPACE)).toEqual(WORKSPACE);
    });

    it('collection-write-item carries the envelope of the item beside its path', () => {
        const fields = { kind: 'message', name: 'Pedido creado', tags: ['pagos'] };

        expect(collectionWriteItemRequestSchema.parse({ ...WORKSPACE, fields })).toEqual({
            ...WORKSPACE,
            fields,
        });
    });
});
