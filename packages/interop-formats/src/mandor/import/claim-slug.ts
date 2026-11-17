import { slugFor } from '@mandor/interop-core';

/** The id a name takes among the ones already taken, which then count it too. */
export function claimSlug(taken: Set<string>, name: string, fallback: string): string {
    const slug = slugFor(name, [...taken], fallback);

    taken.add(slug);

    return slug;
}
