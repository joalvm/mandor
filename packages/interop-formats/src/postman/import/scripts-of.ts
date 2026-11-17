import { degradation, type Degradation, type InteropScript } from '@mandor/interop-core';
import type { ImportedScript } from '@mandor/schema';

export type ScriptsMapping = { importedScripts: ImportedScript[]; degradations: Degradation[] };

const KIND = { onBeforeRequest: 'pre-request', onResponse: 'test' } as const;

/**
 * The scripts of a level as text to keep. A script Postman switched off is not kept, and none
 * runs: it is the text of another app, and the person converts it into a script of their own.
 */
export function scriptsOf(scripts: readonly InteropScript[] | undefined): ScriptsMapping {
    const all = scripts ?? [];

    return {
        importedScripts: all
            .filter((script) => script.enabled)
            .map(({ event, dialect, source }) => ({ event, dialect, source })),
        degradations: all.map((script) =>
            script.enabled
                ? degradation('scriptAsText', { kind: KIND[script.event] })
                : degradation('scriptDisabled', { kind: KIND[script.event] }),
        ),
    };
}
