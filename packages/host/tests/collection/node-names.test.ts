import { describe, expect, it } from 'vitest';

import { holderName, nodeName } from '../../src/collection/node-names.js';
import { mountedWorkspace, WORKSPACE } from './support/mounted-workspace.js';

const { repo } = mountedWorkspace();

const { workspaceId } = WORKSPACE;

describe('the name a person reads for a node of the collection', () => {
    it('reads the name of an item from its own file', async () => {
        await expect(nodeName(repo(), workspaceId, 'pedidos/pedido-creado')).resolves.toBe(
            'Pedido creado',
        );
    });

    it('reads the name of a collection from the file that holds its order', async () => {
        await expect(nodeName(repo(), workspaceId, 'pedidos')).resolves.toBe('Pedidos');
    });

    it('is empty once the node is gone', async () => {
        await expect(nodeName(repo(), workspaceId, 'pedidos/pedido-fantasma')).resolves.toBe('');
    });
});

describe('the name of what holds a node', () => {
    it('is the name of the folder above it', async () => {
        await expect(holderName(repo(), workspaceId, 'pedidos')).resolves.toBe('Pedidos');
    });

    it('is the name of the workspace at the top level', async () => {
        await expect(holderName(repo(), workspaceId, '')).resolves.toBe('API de pagos');
    });
});
