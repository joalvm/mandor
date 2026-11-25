import { useStore } from 'zustand';

import { scriptOutputStore } from '../lib/script-output-store.js';
import { requestsStore } from '../requests-store.js';

/**
 * Whether a script of the request itself stopped on its last send: written wrong, or written in
 * the words of another tool that came in with an import. Its section says so from the strip, the
 * way the schema says the body breaks it; what stopped it is told in the console.
 */
export function useScriptsBroke(resource: string): boolean {
    const sendId = useStore(requestsStore, (state) => {
        const entry = state.sends[resource];

        return entry !== undefined && 'sendId' in entry ? entry.sendId : undefined;
    });

    return useStore(scriptOutputStore, (state) => {
        const errors = sendId === undefined ? [] : (state.runs[sendId]?.output?.errors ?? []);

        return errors.some((error) => error.level === 'request');
    });
}
