import type { FormatDocument } from '@mandor/interop-core';
import {
    REQUEST_SCRIPT_EVENTS,
    type RequestScriptEvent,
    type RequestScripts,
} from '@mandor/schema';

/** The kind OpenCollection names the script of each moment of Mandor by. */
const KIND_OF_EVENT: Record<RequestScriptEvent, string> = {
    onBeforeRequest: 'before-request',
    onResponse: 'after-response',
};

/**
 * The scripts of a level or a request as OpenCollection lists them: one block per moment, before
 * the request and after the response, with its text as it is. Bruno cannot switch a script off,
 * so one that is off is not written: written, it would run there.
 */
export function scriptBlocksOf(scripts: RequestScripts | undefined): FormatDocument[] {
    return REQUEST_SCRIPT_EVENTS.flatMap((event) => {
        const entry = scripts?.[event];

        if (entry === undefined || entry.enabled === false || entry.source.trim() === '') {
            return [];
        }

        return [{ type: KIND_OF_EVENT[event], code: entry.source }];
    });
}
