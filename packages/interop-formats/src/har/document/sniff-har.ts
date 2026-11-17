import { documentRootOf, isRecord } from '@mandor/interop-core';

/** Whether the root of a text holds the `log.entries` a browser recording is made of. */
export function sniffHar(text: string): boolean {
    const log = documentRootOf(text)?.['log'];

    return isRecord(log) && Array.isArray(log['entries']);
}
