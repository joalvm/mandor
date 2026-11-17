import { nameOr } from './resource-parts.js';

/**
 * The documents of one import with names that tell them apart. Two collections of one name would
 * file in the same directory: the later takes `(2)`. A document with no name takes the word of
 * its format.
 */
export function namedApart<T extends { name: string }>(
    documents: readonly T[],
    fallback: string,
): T[] {
    const taken = new Set<string>();

    return documents.map((document) => {
        const wanted = nameOr(document.name, fallback);
        let name = wanted;
        let count = 2;

        while (taken.has(name)) {
            name = `${wanted} (${String(count)})`;
            count += 1;
        }

        taken.add(name);

        return { ...document, name };
    });
}
