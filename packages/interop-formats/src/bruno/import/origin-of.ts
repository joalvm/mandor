import type { ItemOrigin } from '@mandor/schema';

/** The origin every resource of the collection shares. */
export function originOf(sourceId: string, fingerprint: string): ItemOrigin {
    return { kind: 'bruno', sourceId, fingerprint };
}
