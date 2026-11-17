import {
    pushToWindow,
    readSecret,
    systemNetworkFor,
    systemSaveDialog,
    type AppHandlers,
} from '@mandor/host';
import { CHANNELS, fitScriptNote } from '@mandor/ipc';
import { assertSocketUrl, ConnectionManager } from '@mandor/transport-async';
import type { FileFilter } from 'electron';

import { registerConnectionHandlers } from './connection/connection.handlers.js';
import { registerJsonlExportHandlers } from './export/jsonl.handlers.js';
import { createActivityRecorder } from './record/activity-recorder.js';
import { registerRecordHandlers } from './record/record.handlers.js';
import { systemReveal } from './record/system-reveal.js';
import { registerWsHandlers } from './ws/ws.handlers.js';

/** What the activity of a socket is written as, whether recorded or exported: lines of JSON. */
const JSON_LINES: readonly FileFilter[] = [{ name: 'JSON Lines', extensions: ['jsonl'] }];

function jsonLines() {
    return JSON_LINES;
}

/** The connections of a workspace: the unit of work of Async, which Sync never has. */
const connectionHandlers: AppHandlers = (ipc, { notices, logger }) => [
    registerConnectionHandlers(ipc, { notices, logger }),
];

/**
 * The sockets and the recording of what they carry. They share the recorder, so they are
 * registered together: the recording writes what arrived beside the push that shows it.
 */
const socketHandlers: AppHandlers = (ipc, context) => {
    const { window, userDataDir } = context;
    const recorder = createActivityRecorder({
        onState: (push) => {
            pushToWindow(window, CHANNELS.recordState, push);
        },
    });

    return [
        registerWsHandlers(ipc, {
            window,
            createManager: (events) => new ConnectionManager(events),
            assertUrl: assertSocketUrl,
            readSecret: (key) => readSecret(userDataDir, key),
            networkFor: systemNetworkFor(userDataDir),
            recorder,
            scriptWorker: context.scripts,
            scriptVariables: context.scriptVariables,
            logger: context.logger,
            onScriptNote: (note) => {
                pushToWindow(window, CHANNELS.wsScriptNote, fitScriptNote(note));
            },
        }),
        registerRecordHandlers(ipc, {
            recorder,
            chooseSavePath: systemSaveDialog(jsonLines),
            reveal: systemReveal(),
        }),
    ];
};

/** The activity of a socket written to a file: what Async exports and Sync has nothing of. */
const activityExportHandlers: AppHandlers = (ipc) => [
    registerJsonlExportHandlers(ipc, { chooseSavePath: systemSaveDialog(jsonLines) }),
];

/** The channels only Async answers, registered by the host after the common ones. */
export const ASYNC_HANDLERS: readonly AppHandlers[] = [
    connectionHandlers,
    socketHandlers,
    activityExportHandlers,
];
