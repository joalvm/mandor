import type { InteropScript } from '@mandor/interop-core';
import type { ImportedScriptEvent } from '@mandor/schema';

import type { PostmanEvent } from '../document/postman-collection-schema.js';

const EVENTS = new Map<string, ImportedScriptEvent>([
    ['prerequest', 'onBeforeRequest'],
    ['test', 'onResponse'],
]);

/**
 * The scripts of an `event` list. Postman has two events Mandor has an equivalent for; any other
 * `listen` goes nowhere, and so does a script with nothing in it. Nothing runs them.
 */
export function scriptsOf(events: readonly PostmanEvent[] | null | undefined): InteropScript[] {
    return (events ?? []).flatMap((event) => {
        const kind = EVENTS.get(event.listen);
        const exec = event.script?.exec;
        const source = Array.isArray(exec) ? exec.join('\n') : (exec ?? '');

        if (kind === undefined || source.trim() === '') {
            return [];
        }

        return [{ event: kind, dialect: 'postman', source, enabled: event.disabled !== true }];
    });
}
