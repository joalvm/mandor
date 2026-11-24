import {
    ownScriptsOrNothing,
    REQUEST_SCRIPT_EVENTS,
    type RequestScripts,
    type ScriptEntry,
} from '@mandor/schema';

import type { InteropScript } from '../ir/interop-document.js';

const GAP = '\n\n';

/**
 * The one script of a moment, from all the document wrote for it: in order, a blank line between
 * them. When some are switched on, those are the script; when all are off, it comes switched off.
 */
function entryOf(written: readonly InteropScript[]): ScriptEntry | undefined {
    const on = written.filter(({ enabled }) => enabled);
    const taken = on.length > 0 ? on : written;

    if (taken.length === 0) {
        return undefined;
    }

    const source = taken.map((script) => script.source).join(GAP);

    return on.length > 0 ? { source } : { source, enabled: false };
}

/**
 * The own scripts of a level or a request, from the scripts a document wrote for it, as they came:
 * nothing is translated, and a script with nothing in it is no script. They are not approved, so
 * nothing runs them until a person does.
 */
export function ownScriptsOf(
    scripts: readonly InteropScript[] | undefined,
): RequestScripts | undefined {
    const written = (scripts ?? []).filter(({ source }) => source.trim() !== '');
    const own: RequestScripts = {};

    for (const event of REQUEST_SCRIPT_EVENTS) {
        const entry = entryOf(written.filter((script) => script.event === event));

        if (entry !== undefined) {
            own[event] = entry;
        }
    }

    return ownScriptsOrNothing(own);
}
