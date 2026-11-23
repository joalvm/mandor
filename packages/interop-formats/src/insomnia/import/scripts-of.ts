import { ownScriptsOf } from '@mandor/interop-core';
import type { RequestScripts } from '@mandor/schema';

import type { InsomniaScripts } from '../document/insomnia-tree.js';

const SLOTS = [
    { part: 'preRequest', event: 'onBeforeRequest' },
    { part: 'afterResponse', event: 'onResponse' },
] as const;

/**
 * The own scripts of a request or a folder, one per slot that says something, as they came:
 * nothing is translated, and nothing runs them until a person approves them.
 */
export function scriptsOf(scripts: InsomniaScripts): RequestScripts | undefined {
    return ownScriptsOf(
        SLOTS.map(({ part, event }) => ({ event, source: scripts[part], enabled: true })),
    );
}
