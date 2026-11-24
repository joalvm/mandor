import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { status } from '@mandor/git';
import { CHANNELS, type Result } from '@mandor/ipc';
import type { Connection } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerConnectionHandlers } from '../../../../src/main/connection/connection.handlers.js';
import { connectionRepo } from './support/connection-repo.js';
import { flushAllCommits } from '@mandor/host';
import { closeRepo, type IpcSpy, openRepo, silentReporting, spyIpc } from '@mandor/host/testing';

const WORKSPACE = { workspaceId: 'api-de-pagos' };

let ipc: IpcSpy;
let dispose: () => void;
let root: string;
let ecoId: string;

const freshRepo = connectionRepo();

beforeEach(async () => {
    root = await freshRepo();
    ipc = spyIpc();
    dispose = registerConnectionHandlers(ipc, silentReporting());

    openRepo(root);
});

afterEach(async () => {
    dispose();
    closeRepo();

    await rm(root, { recursive: true, force: true });
});

function create(payload: unknown): Promise<Result<Connection>> {
    return ipc.call(CHANNELS.connectionCreate, payload) as Promise<Result<Connection>>;
}

function update(payload: unknown): Promise<Result<Connection>> {
    return ipc.call(CHANNELS.connectionUpdate, payload) as Promise<Result<Connection>>;
}

describe('updating a connection from the renderer', () => {
    beforeEach(async () => {
        const created = await create({
            ...WORKSPACE,
            name: 'Eco',
            url: 'wss://echo.example/socket',
        });

        if (!created.ok) {
            throw new Error('the connection was not created');
        }

        ecoId = created.value.id;
    });

    it('answers with the connection as it is now', async () => {
        await expect(
            update({ ...WORKSPACE, connectionId: ecoId, changes: { name: 'Eco de pruebas' } }),
        ).resolves.toMatchObject({ ok: true, value: { id: ecoId, name: 'Eco de pruebas' } });
    });

    it('lands two saves sent in a row in the order they were sent', async () => {
        const [, last] = await Promise.all([
            update({ ...WORKSPACE, connectionId: ecoId, changes: { url: 'wss://first.example' } }),
            update({
                ...WORKSPACE,
                connectionId: ecoId,
                changes: { name: 'Eco 2', url: 'wss://last.example' },
            }),
        ]);

        expect(last).toMatchObject({ ok: true, value: { url: 'wss://last.example' } });
        await expect(
            update({ ...WORKSPACE, connectionId: ecoId, changes: {} }),
        ).resolves.toMatchObject({ ok: true, value: { name: 'Eco 2', url: 'wss://last.example' } });
    });

    it('moves the connection to socket.io with the url it dials', async () => {
        await expect(
            update({
                ...WORKSPACE,
                connectionId: ecoId,
                changes: { transport: 'socketio', url: 'https://echo.example' },
            }),
        ).resolves.toMatchObject({
            ok: true,
            value: { transport: 'socketio', url: 'https://echo.example' },
        });
    });

    it('refuses a change of transport that leaves the url behind', async () => {
        await expect(
            update({ ...WORKSPACE, connectionId: ecoId, changes: { transport: 'socketio' } }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    it('leaves nothing pending behind it', async () => {
        await update({ ...WORKSPACE, connectionId: ecoId, changes: { name: 'Eco de pruebas' } });
        await flushAllCommits();

        await expect(status(root)).resolves.toMatchObject({ clean: true });
    });

    it('keeps the url template while selecting an environment', async () => {
        await update({
            ...WORKSPACE,
            connectionId: ecoId,
            changes: { environmentId: 'local', url: 'ws://{{host}}/' },
        });

        const yaml = await readFile(
            join(root, 'workspaces', WORKSPACE.workspaceId, 'connections', `${ecoId}.yaml`),
            'utf8',
        );

        expect(yaml).toContain('ws://{{host}}/');
        expect(yaml).toContain('environmentId: local');
    });

    /** The params table and the auth section save through this channel like every other field. */
    it('keeps on disk the params and the auth it is given', async () => {
        await update({
            ...WORKSPACE,
            connectionId: ecoId,
            changes: {
                auth: { type: 'bearer', token: '{{token}}' },
                params: [{ enabled: true, key: 'room', value: 'lobby' }],
            },
        });

        const yaml = await readFile(
            join(root, 'workspaces', WORKSPACE.workspaceId, 'connections', `${ecoId}.yaml`),
            'utf8',
        );

        expect(yaml).toContain('key: room');
        expect(yaml).toContain('token: "{{token}}"');
    });

    it('keeps on disk the scripts it is given, and clears them on a null', async () => {
        const file = join(
            root,
            'workspaces',
            WORKSPACE.workspaceId,
            'connections',
            `${ecoId}.yaml`,
        );

        await update({
            ...WORKSPACE,
            connectionId: ecoId,
            changes: { scripts: { onConnect: { source: 'mandor.socket.send("hola");' } } },
        });

        expect(await readFile(file, 'utf8')).toContain('mandor.socket.send("hola");');

        const cleared = await update({
            ...WORKSPACE,
            connectionId: ecoId,
            changes: { scripts: null },
        });

        expect(cleared.ok ? cleared.value.scripts : 'refused').toBeUndefined();
        expect(await readFile(file, 'utf8')).not.toContain('scripts');
    });

    /** A change the domain refuses leaves the file exactly as it was. */
    it('refuses a change that would break the connection', async () => {
        await expect(
            update({ ...WORKSPACE, connectionId: ecoId, changes: { url: 'file:///etc/passwd' } }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });

        await expect(
            update({ ...WORKSPACE, connectionId: ecoId, changes: {} }),
        ).resolves.toMatchObject({
            ok: true,
            value: { url: 'wss://echo.example/socket' },
        });
    });

    it('answers a connection that is not there with a read failure', async () => {
        await expect(
            update({ ...WORKSPACE, connectionId: 'nadie', changes: { name: 'Eco' } }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'fs-read' } });
    });
});
