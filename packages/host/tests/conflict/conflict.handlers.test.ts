import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import {
    CHANNELS,
    type Channel,
    type ConflictDetail,
    type ConflictSummary,
    type Result,
} from '@mandor/ipc';
import { conflictId, listConflicts, writeConflict } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerConflictHandlers } from '../../src/conflict/conflict.handlers.js';
import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { onConflictsChanged } from '../../src/repo/conflict-events.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';

const ITEM = 'workspaces/pagos/collections/login.yaml';
const AT = '2026-10-07T10:00:00.000Z';

function request(method: string): string {
    return `name: Login\nmethod: ${method}\nurl: /login\nheaders: []\n`;
}

let ipc: IpcSpy;
let dispose: () => void;
let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-clashes-'));
    ipc = spyIpc();
    dispose = registerConflictHandlers(ipc);
    setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root });
});

afterEach(async () => {
    dispose();
    setActiveOrigin(null);
    await rm(root, { force: true, recursive: true });
});

async function keep(path: string, onDisk: string): Promise<void> {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), onDisk, 'utf8');
    await writeConflict(root, {
        path,
        source: 'merge',
        base: request('POST'),
        theirs: request('PUT'),
        at: AT,
    });
}

function list(payload?: unknown): Promise<Result<ConflictSummary[]>> {
    return ipc.call(CHANNELS.conflictList, payload) as Promise<Result<ConflictSummary[]>>;
}

function read(payload: unknown): Promise<Result<ConflictDetail>> {
    return ipc.call(CHANNELS.conflictRead, payload) as Promise<Result<ConflictDetail>>;
}

describe('listing the clashes the open origin keeps', () => {
    it('lists none while the repo keeps none', async () => {
        await expect(list()).resolves.toEqual({ ok: true, value: [] });
    });

    it('lists a clash with its entity, its name, its sections and where it came from', async () => {
        await keep(ITEM, request('PATCH'));

        await expect(list()).resolves.toEqual({
            ok: true,
            value: [
                {
                    id: conflictId(ITEM),
                    entity: { area: 'collections', workspaceId: 'pagos', path: 'login' },
                    name: 'Login',
                    sections: ['method'],
                    source: 'merge',
                    at: AT,
                },
            ],
        });
    });

    it('drops a record with no question left, deletes it and says the list changed', async () => {
        const changed: string[] = [];
        const stop = onConflictsChanged((where) => changed.push(where));

        await keep(ITEM, request('PUT'));

        await expect(list()).resolves.toEqual({ ok: true, value: [] });
        stop();

        expect((await listConflicts(root)).conflicts).toEqual([]);
        expect(changed).toEqual([root]);
    });

    it('refuses while no origin is open', async () => {
        setActiveOrigin(null);

        expect((await list()).ok).toBe(false);
    });
});

describe('opening one clash', () => {
    it('answers with its questions, worked out from the file as it is on disk', async () => {
        await keep(ITEM, request('PATCH'));

        const answer = await read({ id: conflictId(ITEM) });

        expect(answer.ok && answer.value.conflicts.map((each) => each.id)).toEqual(['method']);
        expect(answer.ok && answer.value.name).toBe('Login');
    });

    it('counts what was edited after the provisional version, and a clash with nothing left is gone', async () => {
        await keep(ITEM, request('PATCH'));
        await writeFile(join(root, ITEM), request('PUT'), 'utf8');

        const answer = await read({ id: conflictId(ITEM) });

        expect(answer.ok).toBe(false);
        expect((await listConflicts(root)).conflicts).toEqual([]);
    });

    it('refuses an id the repo keeps no clash of', async () => {
        const answer = await read({ id: conflictId('workspaces/pagos/other.yaml') });

        expect(answer).toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    it('refuses a request that carries anything but an id', async () => {
        await expect(read({ id: 'a', path: '/etc/passwd' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });

    it('leaves no handler behind once it is disposed', () => {
        dispose();

        expect(ipc.registered()).toEqual([]);
    });
});

describe('closing one clash', () => {
    const close = (channel: Channel, payload: unknown): Promise<Result<unknown>> =>
        ipc.call(channel, payload) as Promise<Result<unknown>>;

    it('keeps this copy: the file stays and the record goes', async () => {
        await keep(ITEM, request('PATCH'));

        await expect(close(CHANNELS.conflictKeepMine, { id: conflictId(ITEM) })).resolves.toEqual({
            ok: true,
            value: {},
        });
        expect((await listConflicts(root)).conflicts).toEqual([]);
        expect(await readFile(join(root, ITEM), 'utf8')).toBe(request('PATCH'));
    });

    it('refuses to resolve while a question has no answer, with its own code', async () => {
        await keep(ITEM, request('PATCH'));

        await expect(
            close(CHANNELS.conflictResolve, { id: conflictId(ITEM), choices: {} }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'conflict-open' } });
        expect((await listConflicts(root)).conflicts).toHaveLength(1);
    });

    it('refuses an id the repo keeps no clash of', async () => {
        await expect(
            close(CHANNELS.conflictKeepMine, { id: conflictId('workspaces/pagos/other.yaml') }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    it('refuses an answer that is neither a side nor a text', async () => {
        await expect(
            close(CHANNELS.conflictResolve, { id: 'a', choices: { method: { pick: 'base' } } }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });
});
