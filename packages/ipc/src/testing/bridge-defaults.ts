import type { OriginStatePush } from '../origin/origin-state.js';
import type { RecordStatePush } from '../record/record-state.js';
import {
    createEnvironment,
    createLocalOrigin,
    createOrigin,
    createRepo,
    slugify,
} from '@mandor/schema';

import type { CoreBridge } from '../bridge/core-bridge.js';
import type { JsonlExportArea } from '../export/export-jsonl.js';
import type { RecordArea } from '../record/record-area.js';
import { EMPTY_UI_SESSION } from '../session/ui-session.js';
import { success } from '../result/success.js';
import type { WsActivityPush } from '../ws/ws-activity.js';
import type { WsArea } from '../ws/ws-area.js';
import type { WsScriptNote } from '../ws/ws-script-note.js';
import type { WsStatePush } from '../ws/ws-state.js';

export type StateHandler = (push: WsStatePush) => void;
export type ActivityHandler = (push: WsActivityPush) => void;
export type ScriptNoteHandler = (note: WsScriptNote) => void;
export type OriginStateHandler = (push: OriginStatePush) => void;

// What each area of the bridge answers when a test says nothing about it: valid domain data and
// nothing else. Anything a test cares about it passes as an override, so what is left here is
// exactly what the test is saying it does not care about.

export function defaultSession(): CoreBridge['session'] {
    return {
        load: () => Promise.resolve(success(EMPTY_UI_SESSION)),
        save: () => Promise.resolve(success({})),
    };
}

export function defaultAuth(): CoreBridge['auth'] {
    return {
        read: () => Promise.resolve(success({ auth: null })),
        write: () => Promise.resolve(success({})),
        tokenStatus: () => Promise.resolve(success({ state: 'none', expiresAt: null })),
        tokenFetch: () => Promise.resolve(success({ state: 'none', expiresAt: null })),
        tokenForget: () => Promise.resolve(success({})),
    };
}

export function defaultOrigin(stateHandlers: Set<OriginStateHandler>): CoreBridge['origin'] {
    return {
        add: (input) =>
            Promise.resolve(
                success(
                    createOrigin({ id: slugify(input.name), name: input.name, url: input.url }),
                ),
            ),
        check: (input) => Promise.resolve(success({ id: input.id, reachable: true })),
        empty: () => Promise.resolve(success({})),
        list: () => Promise.resolve(success([createLocalOrigin('Local')])),
        remove: () => Promise.resolve(success({})),
        rename: (input) =>
            Promise.resolve(success({ id: input.id, kind: 'remote', name: input.name })),
        switch: () =>
            Promise.resolve(success({ repo: createRepo({ name: 'Demo' }), workspaces: [] })),
        state: () => Promise.resolve(success({ state: 'local-only', busy: false })),
        onStateChanged: (handler) => {
            stateHandlers.add(handler);

            return () => stateHandlers.delete(handler);
        },
    };
}

export function defaultSecret(): CoreBridge['secret'] {
    return {
        set: () => Promise.resolve(success({})),
        clear: () => Promise.resolve(success({})),
        reveal: () => Promise.resolve(success({ value: null })),
        kept: () => Promise.resolve(success([])),
    };
}

export function defaultExport(): CoreBridge['export'] & JsonlExportArea {
    return {
        jsonl: (input) => Promise.resolve(success({ path: `/tmp/${input.suggestedName}` })),
        outline: () => Promise.resolve(success({ name: 'Demo', nodes: [] })),
        write: () => Promise.resolve(success({ path: '/tmp/demo.yaml' })),
    };
}

export function defaultGlobals(): CoreBridge['globals'] {
    return {
        read: () => Promise.resolve(success({ variables: [] })),
        write: (input) => Promise.resolve(success(input.globals)),
    };
}

export function defaultCollections(): CoreBridge['collections'] {
    return {
        tree: () => Promise.resolve(success([])),
        move: () => Promise.resolve(success({})),
        reorder: () => Promise.resolve(success({})),
        renameFolder: () => Promise.resolve(success({})),
        renameItem: () => Promise.resolve(success({})),
        create: (input) => Promise.resolve(success(input.name)),
        delete: () => Promise.resolve(success({})),
        readItem: (input) => Promise.resolve(success({ kind: 'message', name: input.path })),
        writeItem: () => Promise.resolve(success({})),
        search: () => Promise.resolve(success([])),
        chain: () => Promise.resolve(success([])),
        writeSettings: () => Promise.resolve(success({})),
    };
}

export function defaultDoc(): CoreBridge['doc'] {
    return {
        create: () => Promise.resolve(success('')),
        delete: () => Promise.resolve(success({})),
        list: () => Promise.resolve(success([])),
        read: () => Promise.resolve(success('')),
        rename: () => Promise.resolve(success({})),
        write: () => Promise.resolve(success({})),
        revert: () => Promise.resolve(success('')),
    };
}

const EMPTY_PLAN = { name: '', plan: { identity: null, entries: [] } };

export function defaultImport(): CoreBridge['import'] {
    return {
        plan: () => Promise.resolve(success(EMPTY_PLAN)),
        apply: ({ target }) =>
            Promise.resolve(
                success({
                    applied: 0,
                    workspaceId: 'workspaceId' in target ? target.workspaceId : 'imported',
                }),
            ),
        pick: () => Promise.resolve(success({ files: null })),
        cancel: () => Promise.resolve(success({})),
        onProgress: () => () => undefined,
    };
}

export function defaultEnvironment(): CoreBridge['environment'] {
    return {
        create: (input) =>
            Promise.resolve(
                success(createEnvironment({ id: slugify(input.name), name: input.name })),
            ),
        list: () => Promise.resolve(success([])),
        update: () => Promise.resolve(success(createEnvironment({ id: 'local', name: 'Local' }))),
        delete: () => Promise.resolve(success({})),
        loadActive: () => Promise.resolve(success({})),
        saveActive: () => Promise.resolve(success({})),
        loadDefault: () => Promise.resolve(success({ environmentId: null })),
        saveDefault: () => Promise.resolve(success({})),
    };
}

export function defaultRecord(stateHandlers: Set<(push: RecordStatePush) => void>): RecordArea {
    return {
        pick: () => Promise.resolve(success({ path: null })),
        start: () => Promise.resolve(success({})),
        stop: () => Promise.resolve(success({ entries: 0, path: '/tmp/mandor-recording.jsonl' })),
        status: () => Promise.resolve(success({ active: false, entries: 0 })),
        reveal: () => Promise.resolve(success({})),
        onState: (handler) => {
            stateHandlers.add(handler);

            return () => stateHandlers.delete(handler);
        },
    };
}

export function defaultWs(
    stateHandlers: Set<StateHandler>,
    activityHandlers: Set<ActivityHandler>,
    noteHandlers: Set<ScriptNoteHandler>,
): WsArea {
    return {
        open: () => Promise.resolve(success({})),
        send: () => Promise.resolve(success({})),
        close: () => Promise.resolve(success({})),
        retryNow: () => Promise.resolve(success({})),
        onState: (handler) => {
            stateHandlers.add(handler);

            return () => stateHandlers.delete(handler);
        },
        onActivity: (handler) => {
            activityHandlers.add(handler);

            return () => activityHandlers.delete(handler);
        },
        onScriptNote: (handler) => {
            noteHandlers.add(handler);

            return () => noteHandlers.delete(handler);
        },
    };
}
