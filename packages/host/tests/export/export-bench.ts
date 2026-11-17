import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { InteropFormat, OutlineNode } from '@mandor/interop-core';
import { CHANNELS } from '@mandor/ipc';
import {
    createCollectionFolder,
    createCollectionItem,
    createConnection,
    createWorkspace,
    writeRepoTree,
    writeItem,
} from '@mandor/store-fs';

import type { ChooseSaveFolder } from '../../src/export/choose-save-folder.js';
import { registerExportHandlers } from '../../src/export/export.handlers.js';
import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { forgetSessionSecrets } from '../../src/secret/session-secrets.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';
import { fixtureFormat } from '../interop/fixture-format.js';

/** One export handler on a real workspace: a connection, a message and a request to bar. */
export type ExportBench = {
    /** Where the dialog of the system answers; `null` is the user closing it. */
    chosen: string | null;
    dir: string;
    /** Where the folder dialog answers when an export carries several files. */
    folder: string | null;
    ipc: IpcSpy;
    stop: () => Promise<void>;
    /** The names the handler offered the dialog, in order. */
    suggested: string[];
};

export type Outline = { ok: boolean; value: { name: string; nodes: OutlineNode[] } };

/** What an export covers, as the requests of it ask. */
export type ScopeAsked = { scope: 'workspace' } | { scope: 'collection'; collection: string };

const WHOLE_WORKSPACE: ScopeAsked = { scope: 'workspace' };

async function seedWorkspace(dir: string): Promise<void> {
    setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root: dir });
    await writeRepoTree(dir, 'Demo');
    await createWorkspace(dir, { id: 'pasarela', name: 'Pasarela', kind: 'async' });
    await createConnection(dir, 'pasarela', {
        id: 'produccion',
        name: 'produccion',
        transport: 'websocket',
        url: 'wss://pasarela.ejemplo.com/v1',
        headers: [],
    });
    await createCollectionFolder(dir, 'pasarela', '', {
        id: 'pedidosentrantes',
        name: 'pedidosEntrantes',
    });
    await createCollectionItem(dir, 'pasarela', 'pedidosentrantes', {
        id: 'registrarpedido',
        kind: 'message',
        name: 'registrarPedido',
    });
    await writeItem(dir, 'pasarela', 'pedidosentrantes/registrarpedido', {
        kind: 'message',
        name: 'registrarPedido',
        tags: [],
        body: { channel: 'pedidos/entrantes', payload: '{"id":"1"}', payloadType: 'json' },
    });
    await createCollectionItem(dir, 'pasarela', 'pedidosentrantes', {
        id: 'consultarpedido',
        kind: 'request',
        name: 'consultarPedido',
    });
}

export async function openBench(
    formats: readonly InteropFormat[] = [fixtureFormat],
): Promise<ExportBench> {
    const dir = await mkdtemp(join(tmpdir(), 'mandor-export-'));
    const ipc = spyIpc();
    const suggested: string[] = [];
    const chooseSaveFolder: ChooseSaveFolder = () => Promise.resolve(bench.folder);
    const dispose = registerExportHandlers(ipc, {
        chooseSavePath: (name) => {
            suggested.push(name);

            return Promise.resolve(bench.chosen);
        },
        chooseSaveFolder,
        formats,
    });
    const bench: ExportBench = {
        chosen: join(dir, 'out.json'),
        dir,
        folder: join(dir, 'out'),
        ipc,
        stop: async () => {
            dispose();
            forgetSessionSecrets();
            await rm(dir, { recursive: true, force: true });
        },
        suggested,
    };

    await seedWorkspace(dir);

    return bench;
}

export async function outlineOf(
    bench: ExportBench,
    covers: ScopeAsked = WHOLE_WORKSPACE,
): Promise<Outline> {
    return (await bench.ipc.call(CHANNELS.exportOutline, {
        workspaceId: 'pasarela',
        format: 'fixture',
        ...covers,
    })) as Outline;
}

export function everyNode(nodes: readonly OutlineNode[]): OutlineNode[] {
    return nodes.flatMap((node) => [node, ...everyNode(node.children)]);
}

/** The routes of the nodes of one kind, as the outline hands them out. */
export async function idsOf(bench: ExportBench, kind: OutlineNode['kind']): Promise<string[]> {
    const { nodes } = (await outlineOf(bench)).value;

    return everyNode(nodes)
        .filter((node) => node.kind === kind)
        .map((node) => node.id);
}

export async function writeOf(
    bench: ExportBench,
    ids: string[],
    covers: ScopeAsked = WHOLE_WORKSPACE,
): Promise<unknown> {
    return bench.ipc.call(CHANNELS.exportWrite, {
        workspaceId: 'pasarela',
        format: 'fixture',
        chosen: ids,
        ...covers,
    });
}
