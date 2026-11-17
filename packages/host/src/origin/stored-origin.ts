import { originSchema, type Origin } from '@mandor/schema';
import { z } from 'zod';

/**
 * An origin as main knows it: the domain record plus the directory of this machine it lives
 * in. The root never crosses the bridge, so the renderer cannot paint a path by accident.
 */
export type StoredOrigin = Origin & {
    root: string;
};

const storedOriginSchema = originSchema.extend({
    root: z.string().min(1),
});

export const storedOriginListSchema = z.array(storedOriginSchema);

/** What crosses the bridge: the domain record alone, without the directory it lives in. */
export function toOrigin({ id, name, kind, url }: StoredOrigin): Origin {
    return url === undefined ? { id, name, kind } : { id, name, kind, url };
}
