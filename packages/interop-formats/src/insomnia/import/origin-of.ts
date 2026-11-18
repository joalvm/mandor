import type { ItemOrigin } from '@mandor/schema';

/** The origin every resource of the document shares. */
export function originOf(sourceId: string, fingerprint: string): ItemOrigin {
    return { kind: 'insomnia', sourceId, fingerprint };
}
