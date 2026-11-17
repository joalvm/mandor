import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    closeRepo,
    forgetSecrets,
    openRepo,
    spyIpc,
    spyWindow,
    type IpcSpy,
    type WindowSpy,
} from '@mandor/host/testing';
import {
    CHANNELS,
    type ActivityRecord,
    type Empty,
    type Result,
    type WsActivityPush,
    type WsStatePush,
} from '@mandor/ipc';
import { createEnvironment, type Variable } from '@mandor/schema';
import {
    createWorkspace,
    writeActiveEnvironments,
    writeEnvironment,
    writeRepoTree,
} from '@mandor/store-fs';
import { assertSocketUrl, ConnectionManager } from '@mandor/transport-async';

import type { EventNote } from '../../../../../src/main/ws/event-note.js';
import type { ScriptEventsDeps } from '../../../../../src/main/ws/script-events.js';
import { registerWsHandlers } from '../../../../../src/main/ws/ws.handlers.js';

import { approvedScripts } from './approved-scripts.js';

/** The value this machine keeps for `{{token}}`, the secret every guard is about. */
export const SECRET = 'tok_s3cr3t_value';

/** The handlers of the sockets with real ports, a real engine and every script approved. */
export type ScriptSockets = {
    ipc: IpcSpy;
    window: WindowSpy;
    /** Writes one more value into the environment `local`, beside `token`. */
    variable: (name: string, value: string) => Promise<void>;
    open: (payload: Record<string, unknown>) => Promise<Result<Empty>>;
    close: (connectionId?: string) => Promise<Result<Empty>>;
    /** What the scripts that run while a socket lives said, in order. */
    notes: EventNote[];
    /** Turns the switch of this machine off or on again, as the person would. */
    switchScripts: (on: boolean) => void;
    /** The frames the window was told for one connection, in order. */
    frames: (connectionId?: string) => ActivityRecord[];
    /** The states the window was told for one connection, in order. */
    states: (connectionId?: string) => WsStatePush['state'][];
    stop: () => Promise<void>;
};

function token(): Variable {
    return { name: 'token', value: '', enabled: true, secret: true };
}

/** `limits`: the caps of the scripts that run while a socket lives, when a test sets its own. */
export async function startScriptSockets(
    limits?: ScriptEventsDeps['limits'],
): Promise<ScriptSockets> {
    const root = await mkdtemp(join(tmpdir(), 'mandor-ws-scripts-'));
    const ipc = spyIpc();
    const window = spyWindow();
    const variables: Variable[] = [token()];
    const notes: EventNote[] = [];
    let switchOn = true;
    const { scripts, scriptVariables, logger } = approvedScripts([], () => switchOn);
    const dispose = registerWsHandlers(ipc, {
        window,
        assertUrl: assertSocketUrl,
        createManager: (events) => new ConnectionManager(events),
        readSecret: (key) => Promise.resolve(key === 'local/payments/local/token' ? SECRET : null),
        networkFor: () => Promise.resolve({ tls: {} }),
        scriptWorker: scripts,
        scriptVariables,
        logger,
        onScriptNote: (note) => {
            notes.push(note);
        },
        scriptLimits: limits,
    });

    async function writeLocal(): Promise<void> {
        await writeEnvironment(
            root,
            'payments',
            createEnvironment({ id: 'local', name: 'Local', variables }),
        );
    }

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'payments', name: 'Payments', kind: 'async' });
    await writeLocal();
    await writeActiveEnvironments(root, { payments: 'local' });
    openRepo(root);

    return {
        ipc,
        window,
        variable: async (name, value) => {
            variables.push({ name, value, enabled: true, secret: false });
            await writeLocal();
        },
        open: (payload) =>
            ipc.call(CHANNELS.wsOpen, {
                connectionId: 'echo',
                workspaceId: 'payments',
                environmentId: 'local',
                ...payload,
            }) as Promise<Result<Empty>>,
        close: (connectionId = 'echo') =>
            ipc.call(CHANNELS.wsClose, { connectionId }) as Promise<Result<Empty>>,
        notes,
        switchScripts: (on) => {
            switchOn = on;
        },
        frames: (connectionId = 'echo') =>
            window.sent
                .filter(([channel]) => channel === CHANNELS.wsActivity)
                .map(([, push]) => push as WsActivityPush)
                .filter((push) => push.connectionId === connectionId)
                .flatMap((push) => push.records),
        states: (connectionId = 'echo') =>
            window.sent
                .filter(([channel]) => channel === CHANNELS.wsState)
                .map(([, push]) => push as WsStatePush)
                .filter((push) => push.connectionId === connectionId)
                .map((push) => push.state),
        stop: async () => {
            dispose();
            closeRepo();
            forgetSecrets();
            await rm(root, { recursive: true, force: true });
        },
    };
}
