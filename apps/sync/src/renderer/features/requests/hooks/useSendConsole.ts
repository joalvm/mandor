import { useMessages } from '@mandor/i18n';
import type { RequestSendLog } from '@mandor/ipc';
import { writeConsole } from '@mandor/shell';
import { useEffect, useEffectEvent } from 'react';

import { syncBridge } from '../../../app/sync-bridge.js';
import { scriptOutputStore } from '../lib/script-output-store.js';
import { sendLogLines } from '../lib/send-log-lines.js';

/**
 * Writes every send of the window to its console once it ends, under the heading its scripts
 * write under: what left, and what came back or why nothing did, as a browser keeps the requests
 * of its page. A send the window was not told about writes nothing. Mounted once by the window.
 */
export function useSendConsole(): void {
    const requests = useMessages('requests');
    const errors = useMessages('errors');
    const write = useEffectEvent((log: RequestSendLog) => {
        const place = scriptOutputStore.getState().places[log.sendId];

        if (place !== undefined) {
            writeConsole(
                { id: log.sendId, title: place.title },
                sendLogLines(log, { requests, errors }),
            );
        }
    });

    // The window hears main for as long as it lives, so the subscription has a whole life cycle.
    useEffect(() => syncBridge.request.onSendLog(write), []);
}
