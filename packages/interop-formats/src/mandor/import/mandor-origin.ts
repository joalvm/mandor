import type { ItemOrigin } from '@mandor/schema';

/** The origin every resource of one bundle shares: the workspace it was written from is the source. */
export function mandorOrigin(sourceId: string, fingerprint: string): ItemOrigin {
    return { kind: 'mandor', sourceId, fingerprint };
}
