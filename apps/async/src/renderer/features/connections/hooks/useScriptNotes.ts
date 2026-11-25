import { envStore } from '@mandor/env';
import { useMessages, useScriptWords } from '@mandor/i18n';
import type { WsScriptNote } from '@mandor/ipc';
import { consoleWritesOf, shellStore, writeConsole } from '@mandor/shell';
import { useEffect, useEffectEvent } from 'react';

import { activityStore } from '../../../activity/activity-store.js';
import { scriptEventWords } from '../../../activity/lib/script-note-words.js';
import { asyncBridge } from '../../../app/async-bridge.js';
import { connectionsStore } from '../connections-store.js';
import { selectConnections } from '../selectors.js';
import { connectionScriptEntry } from '../lib/connection-script-entry.js';
import { openConnectionResource } from '../lib/open-connection-resource.js';
import { scriptNoteLines } from '../lib/script-note-lines.js';

function connectionOf(connectionId: string) {
    return selectConnections(connectionsStore.getState()).find((each) => each.id === connectionId);
}

/** A mark on the timeline of the connection, when a tab of it is open to hold it. */
function markTimeline(note: WsScriptNote): void {
    const resource = openConnectionResource(note.connectionId);
    const entry = connectionScriptEntry(note);

    if (resource !== undefined && entry !== undefined) {
        activityStore.getState().appendActivity(resource, [entry]);
    }
}

/** What the scripts set, shown in the environment the connection resolves against. */
function showVariables(note: WsScriptNote, environmentId: string | null): void {
    const workspaceId = shellStore.getState().activeWorkspaceId;

    if (workspaceId !== null && environmentId !== null && note.variables.length > 0) {
        envStore.getState().showScriptVariables(workspaceId, environmentId, note.variables);
    }
}

/**
 * Hears what the scripts of every connection said: a mark on its timeline, the values they set
 * in its environment, and the lines in the console of the window, under the name of the
 * connection and the moment they ran at. Mounted once by the window; the lines are said in the
 * language of the moment they were written, as a console keeps what it printed.
 */
export function useScriptNotes(): void {
    const labels = useMessages('connections');
    const words = useScriptWords();
    const hear = useEffectEvent((note: WsScriptNote) => {
        markTimeline(note);

        const connection = connectionOf(note.connectionId);

        if (connection === undefined) {
            return;
        }

        showVariables(note, connection.environmentId);

        const lines = scriptNoteLines(note, labels, words);
        const event = scriptEventWords(note.event, labels);

        if (lines.length > 0) {
            writeConsole(
                consoleWritesOf(
                    lines,
                    labels('scriptConsoleTitle', { event, name: connection.name }),
                ),
            );
        }
    });

    // The window hears main for as long as it lives, so the subscription has a whole life cycle.
    useEffect(() => asyncBridge.ws.onScriptNote(hear), []);
}
