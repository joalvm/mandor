import type { InteropScope, OutlineNode } from '@mandor/interop-core';
import { success } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExportChoices } from '../../src/export/components/dialog/ExportFormatMenu.js';
import { useExportFlow } from '../../src/export/hooks/useExportFlow.js';

import { AppProviders } from '../support/providers.js';

const NODES: OutlineNode[] = [
    {
        children: [
            { children: [], id: 'collection/0/item/0', kind: 'message', label: 'registrarPedido' },
            {
                children: [],
                id: 'collection/0/item/1',
                kind: 'request',
                label: 'consultarPedido',
                reason: 'messagesNotHttp',
            },
        ],
        id: 'collection/0',
        kind: 'collection',
        label: 'Pedidos',
    },
];

const FORMATS: ExportChoices = [
    { id: 'asyncapi', label: 'AsyncAPI' },
    { id: 'openapi', label: 'OpenAPI' },
];

function mountFlow(onClose: () => void = vi.fn(), scope: InteropScope = 'workspace') {
    return renderHook(() => useExportFlow(onClose, { formats: FORMATS, scope }), {
        wrapper: AppProviders,
    });
}

beforeEach(() => {
    shellStore.getState().setActiveWorkspace('personal');
    vi.spyOn(bridge.export, 'outline').mockResolvedValue(
        success({ name: 'Pasarela', nodes: NODES }),
    );
});

describe('useExportFlow', () => {
    it('asks main for the outline of the open workspace and marks everything it can write', async () => {
        const { result } = mountFlow();

        await act(async () => {
            await result.current.load();
        });

        expect(bridge.export.outline).toHaveBeenCalledWith({
            workspaceId: 'personal',
            format: 'asyncapi',
            scope: 'workspace',
        });
        expect(result.current.name).toBe('Pasarela');
        expect(result.current.nodes.map((node) => node.id)).toEqual(['collection/0']);
        expect([...result.current.chosen]).toEqual(['collection/0/item/0']);
        expect(result.current.busy).toBeNull();
    });

    it('writes only what is left marked, and closes when the file lands', async () => {
        const onClose = vi.fn();
        const write = vi
            .spyOn(bridge.export, 'write')
            .mockResolvedValue(success({ path: '/tmp/pasarela.yaml' }));
        const { result } = mountFlow(onClose);

        await act(async () => {
            await result.current.load();
        });

        await act(async () => {
            await result.current.save();
        });

        expect(write).toHaveBeenCalledWith({
            workspaceId: 'personal',
            format: 'asyncapi',
            scope: 'workspace',
            chosen: ['collection/0/item/0'],
        });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('keeps the dialog open when the user closed the dialog of the system', async () => {
        const onClose = vi.fn();

        vi.spyOn(bridge.export, 'write').mockResolvedValue(success({ path: null }));

        const { result } = mountFlow(onClose);

        await act(async () => {
            await result.current.load();
        });

        await act(async () => {
            await result.current.save();
        });

        expect(onClose).not.toHaveBeenCalled();
        expect(result.current.chosen.size).toBe(1);
    });

    it('writes nothing when the user cleared every mark', async () => {
        // The spy outlives the test that made it: what earlier tests wrote is not this one's.
        const write = vi.spyOn(bridge.export, 'write').mockClear();
        const { result } = mountFlow();

        await act(async () => {
            await result.current.load();
        });

        act(() => {
            result.current.choose(new Set());
        });

        await act(async () => {
            await result.current.save();
        });

        expect(write).not.toHaveBeenCalled();
    });

    it('starts on the first format of the app', () => {
        const { result } = mountFlow();

        expect(result.current.format).toBe('asyncapi');
    });

    it('asks for one collection, and writes the same one, when the scope is a collection', async () => {
        const write = vi
            .spyOn(bridge.export, 'write')
            .mockResolvedValue(success({ path: '/tmp/pedidos.yaml' }));
        const { result } = mountFlow(vi.fn(), 'collection');

        await act(async () => {
            await result.current.load('pedidos');
        });

        expect(bridge.export.outline).toHaveBeenLastCalledWith({
            workspaceId: 'personal',
            format: 'asyncapi',
            scope: 'collection',
            collection: 'pedidos',
        });

        await act(async () => {
            await result.current.save();
        });

        expect(write).toHaveBeenLastCalledWith({
            workspaceId: 'personal',
            format: 'asyncapi',
            scope: 'collection',
            collection: 'pedidos',
            chosen: ['collection/0/item/0'],
        });
    });

    it('reads the outline again, on the same collection, when another format is chosen', async () => {
        const { result } = mountFlow(vi.fn(), 'collection');

        await act(async () => {
            await result.current.load('pedidos');
        });

        await act(async () => {
            await result.current.setFormat('openapi');
        });

        expect(result.current.format).toBe('openapi');
        expect(bridge.export.outline).toHaveBeenLastCalledWith({
            workspaceId: 'personal',
            format: 'openapi',
            scope: 'collection',
            collection: 'pedidos',
        });
    });
});
