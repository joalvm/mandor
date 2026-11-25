import { useMessages, useScriptWords } from '@mandor/i18n';
import { consoleWritesOf, writeConsole } from '@mandor/shell';
import { useEffect, useEffectEvent } from 'react';

import { syncBridge } from '../../../app/sync-bridge.js';
import { consoleLines } from '../../../response/lib/script-lines.js';
import { scriptOutputStore } from '../lib/script-output-store.js';

/**
 * Writes what the scripts of every send said to the console of the window, under a heading with
 * the method and the name of the request, the two moments of a send under one heading. A send
 * whose scripts said nothing writes nothing, and one the window was not told about neither.
 * Mounted once by the window; the lines are said in the language of the moment they were
 * written, as a console keeps what it printed.
 */
export function useScriptConsole(): void {
    const labels = useMessages('requests');
    const words = useScriptWords();
    const write = useEffectEvent((push: Parameters<typeof consoleLines>[0]) => {
        const place = scriptOutputStore.getState().places[push.sendId];
        const lines = consoleLines(push, labels, words);

        if (place !== undefined && lines.length > 0) {
            writeConsole(consoleWritesOf(lines, place.title));
        }
    });

    // The window hears main for as long as it lives, so the subscription has a whole life cycle.
    useEffect(() => syncBridge.request.onScriptOutput(write), []);
}
