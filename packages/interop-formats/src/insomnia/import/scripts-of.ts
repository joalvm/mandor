import { degradation, type Degradation } from '@mandor/interop-core';
import type { ImportedScript } from '@mandor/schema';

import type { InsomniaScripts } from '../document/insomnia-tree.js';

const SLOTS = [
    { part: 'preRequest', event: 'onBeforeRequest', kind: 'pre-request' },
    { part: 'afterResponse', event: 'onResponse', kind: 'after-response' },
] as const;

/**
 * The scripts of a request or a folder as text to keep, one per slot that says something. None
 * runs: it is the text of another app, and the person converts it into a script of their own.
 */
export function scriptsOf(scripts: InsomniaScripts): {
    importedScripts: ImportedScript[];
    degradations: Degradation[];
} {
    const written = SLOTS.filter(({ part }) => scripts[part].trim() !== '');

    return {
        importedScripts: written.map(({ part, event }) => ({
            event,
            dialect: 'insomnia',
            source: scripts[part],
        })),
        degradations: written.map(({ kind }) => degradation('scriptAsText', { kind })),
    };
}
