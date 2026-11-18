import type { FormatDocument } from '@mandor/interop-core';
import type { ImportedScript, ImportedScriptEvent } from '@mandor/schema';

const SLOTS: Record<ImportedScriptEvent, string> = {
    onBeforeRequest: 'preRequest',
    onResponse: 'afterResponse',
};

/**
 * The scripts Insomnia can run, in the slots it has for them, on a request or a folder alike. One
 * written for another tool calls an API Insomnia does not have, so it does not leave here.
 */
export function scriptsDocumentOf(scripts: readonly ImportedScript[] | undefined): FormatDocument {
    const own = (scripts ?? []).filter((script) => script.dialect === 'insomnia');

    return own.length === 0
        ? {}
        : { scripts: Object.fromEntries(own.map(({ event, source }) => [SLOTS[event], source])) };
}
