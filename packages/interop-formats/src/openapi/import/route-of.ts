import { slugify } from '@mandor/schema';

/**
 * The id a name takes on disk, free of the ones already taken. A tag or a title written in a
 * script an id cannot keep still has to enter, so it takes a plain word instead of failing the
 * whole document. `slugify` throws only for such a name, so any throw is that case.
 */
export function routeOf(name: string, taken: readonly string[]): string {
    try {
        return slugify(name, taken);
    } catch {
        return slugify('unnamed', taken);
    }
}
