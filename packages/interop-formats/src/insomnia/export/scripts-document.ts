import type { FormatDocument } from '@mandor/interop-core';
import {
    REQUEST_SCRIPT_EVENTS,
    type RequestScriptEvent,
    type RequestScripts,
} from '@mandor/schema';

const SLOTS: Record<RequestScriptEvent, string> = {
    onBeforeRequest: 'preRequest',
    onResponse: 'afterResponse',
};

/**
 * The own scripts of a request or a folder in the slots Insomnia has for them, as they are:
 * nothing is translated. Insomnia cannot switch a script off, so one that is off stays here
 * rather than run there.
 */
export function scriptsDocumentOf(scripts: RequestScripts | undefined): FormatDocument {
    const slots = REQUEST_SCRIPT_EVENTS.flatMap((event) => {
        const entry = scripts?.[event];

        return entry === undefined || entry.enabled === false || entry.source.trim() === ''
            ? []
            : [[SLOTS[event], entry.source] as const];
    });

    return slots.length === 0 ? {} : { scripts: Object.fromEntries(slots) };
}
