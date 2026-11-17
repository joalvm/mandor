import type { FormatDocument } from '@mandor/interop-core';
import type { ImportedScript, ImportedScriptEvent } from '@mandor/schema';

const EVENTS: Record<ImportedScriptEvent, string> = {
    onBeforeRequest: 'prerequest',
    onResponse: 'test',
};

/**
 * The scripts Postman can run, as the events of a request or a level. One written for another
 * tool calls an API Postman does not have, so it does not leave here.
 */
export function scriptEventsOf(scripts: readonly ImportedScript[] | undefined): FormatDocument[] {
    return (scripts ?? [])
        .filter((script) => script.dialect === 'postman')
        .map(({ event, source }) => ({
            listen: EVENTS[event],
            script: { type: 'text/javascript', exec: source.split('\n') },
        }));
}
