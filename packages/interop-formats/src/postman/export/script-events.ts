import type { FormatDocument } from '@mandor/interop-core';
import {
    REQUEST_SCRIPT_EVENTS,
    type RequestScriptEvent,
    type RequestScripts,
} from '@mandor/schema';

const EVENTS: Record<RequestScriptEvent, string> = {
    onBeforeRequest: 'prerequest',
    onResponse: 'test',
};

/**
 * The own scripts of a request or a level as the events Postman runs, as they are: nothing is
 * translated. A script switched off goes out switched off, and one with nothing in it does not go.
 */
export function scriptEventsOf(scripts: RequestScripts | undefined): FormatDocument[] {
    return REQUEST_SCRIPT_EVENTS.flatMap((event) => {
        const entry = scripts?.[event];

        if (entry === undefined || entry.source.trim() === '') {
            return [];
        }

        return [
            {
                listen: EVENTS[event],
                script: { type: 'text/javascript', exec: entry.source.split('\n') },
                ...(entry.enabled === false ? { disabled: true } : {}),
            },
        ];
    });
}
