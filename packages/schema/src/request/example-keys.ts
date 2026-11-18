import { MAX_SEGMENT_LENGTH } from '../id/segment.js';
import { FORBIDDEN_IN_PATH } from '../resource/resource-part.js';
import type { RequestExample } from './request-example.js';

type Named = readonly Pick<RequestExample, 'name'>[];

const FALLBACK_KEY = 'example';
const DOTS = new Set(['', '.', '..']);
const FORBIDDEN_EVERYWHERE = new RegExp(FORBIDDEN_IN_PATH.source, 'gu');

/** The name of an example made safe to be the last segment of its resource. */
export function exampleKey(name: string): string {
    const key = name.replaceAll(FORBIDDEN_EVERYWHERE, '-').trim();

    return DOTS.has(key) ? FALLBACK_KEY : key.slice(0, MAX_SEGMENT_LENGTH).trim();
}

function numbered(key: string, count: number): string {
    const suffix = ` (${String(count)})`;

    return `${key.slice(0, MAX_SEGMENT_LENGTH - suffix.length).trim()}${suffix}`;
}

/**
 * Each example with its key, in the order given. Names that make the same key come only from a
 * file edited by hand; the later ones are numbered, so the identity of each stays the path.
 */
export function keyExamples<Example extends Named[number]>(
    examples: readonly Example[],
): { example: Example; key: string }[] {
    const taken = new Set<string>();

    return examples.map((example) => {
        const wanted = exampleKey(example.name);
        let key = wanted;

        for (let count = 2; taken.has(key); count += 1) {
            key = numbered(wanted, count);
        }

        taken.add(key);

        return { example, key };
    });
}

/**
 * The examples with names of their own, each the key it already has. The number of a repeated name
 * depends on who comes before it: once it is in the name, losing the first example, which is what
 * deleting it does, does not change the path of the second, or blank the tab that shows it.
 */
export function examplesApart<Example extends Named[number]>(
    examples: readonly Example[],
): Example[] {
    return keyExamples(examples).map(({ example, key }) =>
        key === exampleKey(example.name) ? example : { ...example, name: key },
    );
}

/** The keys of `keyExamples`, for whoever has no use for the examples. */
export function exampleKeys(examples: Named): string[] {
    return keyExamples(examples).map(({ key }) => key);
}

/** The wanted name, or the first `wanted (n)` whose key no example has. */
export function uniqueExampleName(examples: Named, wanted: string): string {
    const taken = new Set(exampleKeys(examples));
    let name = wanted;

    for (let count = 2; taken.has(exampleKey(name)); count += 1) {
        name = `${wanted} (${String(count)})`;
    }

    return name;
}
