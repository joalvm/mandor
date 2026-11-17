import type { RequestExample, RequestExampleOverrides } from './request-example.js';
import type { RequestItem } from './request-item.js';

/** The fields of a request an example may change. Name, method and url are not among them. */
export const EXAMPLE_OVERRIDE_KEYS = [
    'query',
    'headers',
    'pathParams',
    'body',
    'auth',
    'settings',
    'description',
] as const;

/** The request an example sends: the parent as it is now, with what the example changed on top. */
export function exampleRequest(parent: RequestItem, example: RequestExample): RequestItem {
    const changed = Object.entries(example.request ?? {}).filter(
        ([, value]) => value !== undefined,
    );

    return { ...parent, ...Object.fromEntries(changed) };
}

// What an example pins stays its own even when it reads like the request: the params it pins
// tell it apart from the examples of its status that answer with another shape.
const PINNED_KEYS: readonly (typeof EXAMPLE_OVERRIDE_KEYS)[number][] = ['query'];

/**
 * What `edited` changed of `parent`, by value; nothing at all when it changed none. A key the
 * example already pins in `kept` stays, whatever it reads like.
 */
export function exampleOverrides(
    parent: RequestItem,
    edited: RequestItem,
    kept?: RequestExampleOverrides,
): RequestExampleOverrides | undefined {
    const differing = EXAMPLE_OVERRIDE_KEYS.filter(
        (key) =>
            JSON.stringify(edited[key]) !== JSON.stringify(parent[key]) ||
            (PINNED_KEYS.includes(key) && kept?.[key] !== undefined),
    );
    const overrides = Object.fromEntries(differing.map((key) => [key, edited[key]]));

    return differing.length === 0 ? undefined : overrides;
}
