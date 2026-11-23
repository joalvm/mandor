import { ownScriptsOf, type InteropScript } from '@mandor/interop-core';
import type { RequestScriptEvent, RequestScripts } from '@mandor/schema';

import type { BruScript } from './bru-schema.js';
import type { OcScripts } from './opencollection-schema.js';

type OcScript = NonNullable<OcScripts>[number];

/**
 * The moment of Mandor each kind of script of Bruno runs at. The tests run once the response is
 * there, so they go after the script of that moment, in the order Bruno runs them.
 */
const EVENT_OF_KIND: Partial<Record<string, RequestScriptEvent>> = {
    'before-request': 'onBeforeRequest',
    'after-response': 'onResponse',
    tests: 'onResponse',
};

function eventOf(script: OcScript): RequestScriptEvent | undefined {
    return EVENT_OF_KIND[script.type ?? ''];
}

/**
 * The scripts OpenCollection lists for a level or a request, in the own script of each moment, as
 * they came and not yet approved. A kind Mandor has no moment for is not read here.
 */
export function scriptsOfOpenCollection(scripts: OcScripts): RequestScripts | undefined {
    return ownScriptsOf(
        (scripts ?? []).flatMap((script): InteropScript[] => {
            const event = eventOf(script);

            return event === undefined ? [] : [{ event, source: script.code ?? '', enabled: true }];
        }),
    );
}

/** The scripts of a `.bru` file: its `script:pre-request`, `script:post-response` and `tests`. */
export function scriptsOfBru(
    script: BruScript,
    tests: string | null | undefined,
): RequestScripts | undefined {
    return scriptsOfOpenCollection([
        { type: 'before-request', code: script?.req },
        { type: 'after-response', code: script?.res },
        { type: 'tests', code: tests },
    ]);
}

/** The scripts of a kind Mandor has no moment for (hooks, gRPC…), which the import names as left out. */
function unreadScriptsOf(scripts: OcScripts): OcScript[] {
    return (scripts ?? []).filter(
        (script) => eventOf(script) === undefined && (script.code ?? '').trim() !== '',
    );
}

/** The scripts OpenCollection lists, split into the ones Mandor reads and the ones it leaves out. */
export function scriptPartsOf(scripts: OcScripts): {
    read: RequestScripts | undefined;
    unread: OcScript[];
} {
    return { read: scriptsOfOpenCollection(scripts), unread: unreadScriptsOf(scripts) };
}
