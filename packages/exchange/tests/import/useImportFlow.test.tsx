import type { InteropScope } from '@mandor/interop-core';
import { success } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { MessagesProvider } from '@mandor/i18n';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useImportFlow } from '../../src/import/hooks/useImportFlow.js';
import type { ImportChoice } from '../../src/import/lib/import-choice.js';
import { onImported } from '../../src/import/lib/imported-signal.js';

import { AppProviders } from '../support/providers.js';

const origin = { kind: 'openapi' as const, sourceId: 'abc' };

const FOLDER = {
    class: 'add' as const,
    place: 'folder' as const,
    route: 'pedidos',
    name: 'pedidos',
    resource: {
        place: 'folder' as const,
        itemKind: null,
        route: 'pedidos',
        name: 'pedidos',
        fields: {},
        origin,
        degradations: [],
    },
    selected: true,
};

const built = { name: 'Pasarela', plan: { identity: origin, entries: [FOLDER] } };

const SCRIPTS = { onBeforeRequest: { source: 'x' }, onResponse: { source: 'y' } };

/** The same plan, its folder bringing a script of another app for each moment. */
const BRINGING_SCRIPTS = {
    ...built,
    plan: {
        ...built.plan,
        entries: [
            {
                ...FOLDER,
                resource: { ...FOLDER.resource, fields: { scripts: SCRIPTS } },
            },
        ],
    },
};

const FORMATS: ImportChoice[] = [{ label: 'OpenAPI', hint: '3.x', input: 'files' }];
const FILES = [{ path: 'api.yaml', text: 'openapi: 3.1.0' }];

function flow(onClose = vi.fn(), onImportedHere = vi.fn(), scope: InteropScope = 'workspace') {
    return renderHook(
        () => useImportFlow(onClose, { formats: FORMATS, onImported: onImportedHere, scope }),
        { wrapper: AppProviders },
    );
}

/** Builds the plan and applies it, with the toasts it raises going to `onNotify`. */
async function buildAndApply(onNotify: () => void): Promise<void> {
    function Wrapper({ children }: { children: ReactNode }) {
        return (
            <MessagesProvider preferences={{ language: 'en' }}>
                <TooltipProvider>
                    <ToastProvider messages={{ close: 'Close', more: String }} onNotify={onNotify}>
                        {children}
                    </ToastProvider>
                </TooltipProvider>
            </MessagesProvider>
        );
    }

    const { result } = renderHook(
        () =>
            useImportFlow(vi.fn(), { formats: FORMATS, onImported: vi.fn(), scope: 'collection' }),
        { wrapper: Wrapper },
    );

    await act(async () => {
        await result.current.build(FILES);
    });
    await act(async () => {
        await result.current.apply();
    });
}

describe('useImportFlow', () => {
    beforeEach(() => {
        shellStore.getState().setActiveWorkspace('personal');
        vi.spyOn(bridge.import, 'plan').mockResolvedValue(success(built));
        vi.spyOn(bridge.import, 'apply').mockResolvedValue(
            success({ applied: 1, workspaceId: 'personal' }),
        );
    });

    it('sends the files alone, for main to find their format, and counts what is marked', async () => {
        const { result } = flow(vi.fn(), vi.fn(), 'collection');

        await act(async () => {
            await result.current.build(FILES);
        });

        await waitFor(() => {
            expect(result.current.plan).not.toBeNull();
        });

        expect(bridge.import.plan).toHaveBeenCalledWith({
            workspaceId: 'personal',
            files: FILES,
            scope: 'collection',
        });
        expect(result.current.name).toBe('Pasarela');
        expect(result.current.counts).toEqual({ selected: 1, total: 1 });
    });

    it('asks main for the plan of a collection when the door is the one of a collection', async () => {
        const { result } = flow(vi.fn(), vi.fn(), 'collection');

        await act(async () => {
            await result.current.build(FILES);
        });

        expect(bridge.import.plan).toHaveBeenCalledWith({
            workspaceId: 'personal',
            files: FILES,
            scope: 'collection',
        });
    });

    it('closes, rings the doorbell and tells the app which workspace was written', async () => {
        const onClose = vi.fn();
        const onImportedHere = vi.fn();
        const rang = vi.fn();
        const stop = onImported(rang);
        const { result } = flow(onClose, onImportedHere, 'collection');

        await act(async () => {
            await result.current.build(FILES);
        });
        await act(async () => {
            await result.current.apply();
        });

        stop();

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(rang).toHaveBeenCalledTimes(1);
        expect(onImportedHere).toHaveBeenCalledWith({ workspaceId: 'personal' });
    });

    it('sends main the plan as the user left it, and nothing about a report', async () => {
        const { result } = flow(vi.fn(), vi.fn(), 'collection');

        await act(async () => {
            await result.current.build(FILES);
        });
        await act(async () => {
            await result.current.apply();
        });

        expect(bridge.import.apply).toHaveBeenCalledWith({
            target: { workspaceId: 'personal' },
            name: 'Pasarela',
            plan: built.plan,
        });
    });

    it('needs no open workspace for the door of a workspace, which makes its own', async () => {
        shellStore.getState().setActiveWorkspace(null);

        const onImportedHere = vi.fn();
        const { result } = flow(vi.fn(), onImportedHere, 'workspace');

        vi.spyOn(bridge.import, 'apply').mockResolvedValue(
            success({ applied: 1, workspaceId: 'pasarela' }),
        );

        await act(async () => {
            await result.current.build(FILES);
        });
        await act(async () => {
            await result.current.apply();
        });

        expect(bridge.import.plan).toHaveBeenCalledWith({ files: FILES, scope: 'workspace' });
        expect(bridge.import.apply).toHaveBeenCalledWith({
            target: { newWorkspace: 'Pasarela' },
            name: 'Pasarela',
            plan: built.plan,
        });
        expect(onImportedHere).toHaveBeenCalledWith({ workspaceId: 'pasarela' });
    });

    it('says once how many scripts came from another app, waiting for approval', async () => {
        const onNotify = vi.fn();

        vi.spyOn(bridge.import, 'plan').mockResolvedValue(success(BRINGING_SCRIPTS));

        await buildAndApply(onNotify);

        expect(onNotify).toHaveBeenCalledOnce();
        expect(onNotify).toHaveBeenCalledWith(
            expect.objectContaining({
                title: '2 scripts came from another app: they are in the editor of their moment, not approved yet.',
                tone: 'info',
            }),
        );
    });

    it('says nothing when the import brought no script', async () => {
        const onNotify = vi.fn();

        await buildAndApply(onNotify);

        expect(onNotify).not.toHaveBeenCalled();
    });

    it('asks nothing of main for the door of a collection while no workspace is open', async () => {
        shellStore.getState().setActiveWorkspace(null);
        vi.mocked(bridge.import.plan).mockClear();

        const { result } = flow(vi.fn(), vi.fn(), 'collection');

        await act(async () => {
            await result.current.build(FILES);
        });

        expect(bridge.import.plan).not.toHaveBeenCalled();
    });
});
