import { execFile } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { promisify } from 'node:util';

import { flushAllCommits } from '@mandor/host';
import { closeRepo, openRepo, silentReporting, spyIpc, type IpcSpy } from '@mandor/host/testing';
import { CHANNELS, type Result } from '@mandor/ipc';
import type { Connection } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerConnectionHandlers } from '../../../../src/main/connection/connection.handlers.js';
import { connectionRepo } from './support/connection-repo.js';

const exec = promisify(execFile);
const SCOPE = { workspaceId: 'api-de-pagos' };

/** The file of a connection: named by the id main minted, not by what the user called it. */
function connectionFileOf(id: string): string {
    return `workspaces/api-de-pagos/connections/${id}.yaml`;
}

let ipc: IpcSpy;
let dispose: () => void;
let root: string;

async function git(args: string[]): Promise<string[]> {
    const { stdout } = await exec('git', args, { cwd: root });

    return stdout.split('\n').filter((line) => line !== '');
}

/** Creates the Eco connection through the channel and returns the id main minted for it. */
async function createdEco(): Promise<string> {
    const created = (await ipc.call(CHANNELS.connectionCreate, {
        ...SCOPE,
        name: 'Eco',
        url: 'wss://echo.example/socket',
    })) as Result<Connection>;

    if (!created.ok) {
        throw new Error('the connection was not created');
    }

    return created.value.id;
}

const freshRepo = connectionRepo();

beforeEach(async () => {
    root = await freshRepo();
    ipc = spyIpc();
    dispose = registerConnectionHandlers(ipc, silentReporting());

    openRepo(root);
});

afterEach(async () => {
    await flushAllCommits();

    dispose();
    closeRepo();

    await rm(root, { recursive: true, force: true });
});

describe('what the connections leave in the history', () => {
    it('commits a created connection as its own file, in the act', async () => {
        const id = await createdEco();

        await expect(git(['log', '-1', '--pretty=%s'])).resolves.toEqual(['create connection Eco']);
        await expect(git(['show', '--name-only', '--pretty=format:'])).resolves.toEqual([
            connectionFileOf(id),
        ]);
        await expect(git(['status', '--porcelain'])).resolves.toEqual([]);
    });

    it('commits an edit once the calm comes, and only the connection that changed', async () => {
        const id = await createdEco();
        const [before] = await git(['rev-list', '--count', 'HEAD']);

        await ipc.call(CHANNELS.connectionUpdate, {
            ...SCOPE,
            connectionId: id,
            changes: { name: 'Eco de pruebas' },
        });

        await expect(git(['rev-list', '--count', 'HEAD'])).resolves.toEqual([before]);

        await flushAllCommits();

        await expect(git(['log', '-1', '--pretty=%s'])).resolves.toEqual([
            'update connection Eco de pruebas',
        ]);
        await expect(git(['show', '--name-only', '--pretty=format:'])).resolves.toEqual([
            connectionFileOf(id),
        ]);
    });

    it('commits a deleted connection in the act', async () => {
        const id = await createdEco();

        await ipc.call(CHANNELS.connectionDelete, { ...SCOPE, connectionId: id });

        await expect(git(['log', '-1', '--pretty=%s'])).resolves.toEqual(['delete connection Eco']);
        await expect(git(['status', '--porcelain'])).resolves.toEqual([]);
    });
});
