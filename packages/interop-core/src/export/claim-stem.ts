import { slugFor } from '../import/claim-route.js';

/**
 * The name a file or a directory takes on disk, free of the ones already taken in its directory,
 * and taken from then on. Slugs are lowercase, so two names that differ by case still differ.
 */
export function claimStem(name: string, taken: string[], fallback: string): string {
    const stem = slugFor(name, taken, fallback);

    taken.push(stem);

    return stem;
}
