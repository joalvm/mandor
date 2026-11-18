import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CHANNELS } from '@mandor/ipc';
import { createEnvironment } from '@mandor/schema';
import {
    createCollection,
    createCollectionItem,
    createWorkspace,
    writeRepoTree,
    writeActiveEnvironments,
    writeEnvironment,
    writeItem,
} from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerExportHandlers } from '../../src/export/export.handlers.js';
import { redactedIpc } from '../../src/ipc/redacted-ipc.js';
import { createLogger } from '../../src/log/create-logger.js';
import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { forgetSessionSecrets, rememberSessionSecrets } from '../../src/secret/session-secrets.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';
import { fixtureFormat } from '../interop/fixture-format.js';

/** Long enough to be hidden, and shaped like what a user pastes into a token field. */
const VALUE = 'tok_9f4c2ae7';
const HEADER = `Bearer ${VALUE}`;

let ipc: IpcSpy;
let disposers: (() => void)[];
let dir: string;

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mandor-leak-'));
    ipc = spyIpc();
    disposers = [
        registerExportHandlers(redactedIpc(ipc), {
            chooseSavePath: () => Promise.resolve(join(dir, 'activity.jsonl')),
            chooseSaveFolder: () => Promise.resolve(join(dir, 'out')),
            formats: [fixtureFormat],
        }),
    ];
    await writeRepoTree(dir, 'Demo');
    await createWorkspace(dir, { id: 'payments', name: 'Payments', kind: 'async' });
    await writeEnvironment(
        dir,
        'payments',
        createEnvironment({
            id: 'local',
            name: 'Local',
            variables: [{ name: 'token', value: '', enabled: true, secret: true }],
        }),
    );
    await writeActiveEnvironments(dir, { payments: 'local' });
    setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root: dir });
});

afterEach(async () => {
    for (const dispose of disposers) {
        dispose();
    }

    setActiveOrigin(null);
    forgetSessionSecrets();
    await rm(dir, { recursive: true, force: true });
});

/**
 * One test per border out of the process that both apps have. Each starts from a value this
 * machine keeps and the repo never saw, once the session has learned it. The borders only Async
 * has, the socket and its exported activity, are tested in the app.
 */
describe('a value the session learned is secret', () => {
    it('reaches the log file with the marker in place of the value', async () => {
        rememberSessionSecrets([VALUE]);

        const file = join(dir, 'mandor.log');
        const logger = createLogger({ file, level: 'info' });

        logger.log('info', `the connection sent ${HEADER}`);
        await logger.flush();

        const written = await readFile(file, 'utf8');

        expect(written).toContain('[redacted]');
        expect(written).not.toContain(VALUE);
    });

    // A pasted secret can end up inside what the workspace holds, and the document the export
    // writes is the file most likely to travel: it leaves with the marker, never the value.
    it('reaches the exported document with the marker in place of the value', async () => {
        rememberSessionSecrets([VALUE]);

        await createCollection(dir, 'payments', { id: 'pedidos', name: 'Pedidos' });
        await createCollectionItem(dir, 'payments', 'pedidos', {
            id: 'pedidodeprueba',
            kind: 'message',
            name: 'pedidoDePrueba',
        });
        await writeItem(dir, 'payments', 'pedidos/pedidodeprueba', {
            kind: 'message',
            name: 'pedidoDePrueba',
            tags: [],
            body: { payload: JSON.stringify({ token: VALUE }) },
        });

        const answer = await ipc.call(CHANNELS.exportWrite, {
            workspaceId: 'payments',
            format: 'fixture',
            scope: 'workspace',
            chosen: ['collection/0/item/0'],
        });

        expect(answer).toEqual({ ok: true, value: { path: join(dir, 'activity.jsonl') } });

        const written = await readFile(join(dir, 'activity.jsonl'), 'utf8');

        expect(written).toContain('[redacted]');
        expect(written).not.toContain(VALUE);
    });
});
