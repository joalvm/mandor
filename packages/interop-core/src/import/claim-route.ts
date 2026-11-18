import { slugify } from '@mandor/schema';

/** The ids already taken in each directory of the import, by the route of the directory. */
export type TakenRoutes = Map<string, Set<string>>;

/**
 * The id a name takes on disk, free of the ones already taken. A name an id cannot keep still
 * has to enter, so it takes the plain word of its kind: `slugify` throws only for such a name.
 */
export function slugFor(name: string, taken: readonly string[], fallback: string): string {
    try {
        return slugify(name, taken);
    } catch {
        return slugify(fallback, taken);
    }
}

/** The route of a new child of `parent`: folders and requests share a directory, so one id each. */
export function claimRoute(
    taken: TakenRoutes,
    parent: string,
    name: string,
    fallback: string,
): string {
    const used = taken.get(parent) ?? new Set<string>();
    const slug = slugFor(name, [...used], fallback);

    taken.set(parent, used.add(slug));

    return parent === '' ? slug : `${parent}/${slug}`;
}
