import { degradation, type Degradation } from '@mandor/interop-core';
import { unknownKeys } from '../document/unknown-keys.js';

// What the mapping consumes whole. `info` gives its title and lets the rest go; `components` gives
// its security and the schemas the `$ref` already followed.
const KNOWN = ['openapi', 'info', 'servers', 'paths', 'components', 'security', 'tags'];

/**
 * What the root of the document carries that nothing maps: `webhooks`, `externalDocs`, an
 * extension. It rides along as written, and the user is told, because a section the import did
 * not read is not a section the import lost.
 */
export function rootExtrasOf(document: Record<string, unknown>): {
    extras: Record<string, unknown>;
    notes: Degradation[];
} {
    const extras = unknownKeys(document, KNOWN);

    return {
        extras,
        notes: Object.keys(extras).map((key) => degradation('sectionKept', { key })),
    };
}
