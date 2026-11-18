import type { JSONPath } from 'jsonc-parser';

import { isRecord } from '../validate-value/schema-issue.js';

/**
 * One schema inside a schema, and where it sits. A schema applied in place —a branch of
 * `allOf`, the `then` of a condition— describes the same value its parent describes; any other
 * describes a value of its own: a property, an item, a definition.
 */
export type SchemaSpot = {
    path: JSONPath;
    schema: Record<string, unknown>;
    inPlace: boolean;
};

/** How each keyword holds schemas: by name or one after another, and whether in place. */
const HOLDER_OF_KEYWORD: Partial<Record<string, { named: boolean; inPlace: boolean }>> = {
    $defs: { named: true, inPlace: false },
    additionalItems: { named: false, inPlace: false },
    additionalProperties: { named: false, inPlace: false },
    allOf: { named: false, inPlace: true },
    anyOf: { named: false, inPlace: true },
    contains: { named: false, inPlace: false },
    definitions: { named: true, inPlace: false },
    // Draft 7 and before: a schema the value meets when the key is there, or a list of keys.
    dependencies: { named: true, inPlace: true },
    dependentSchemas: { named: true, inPlace: true },
    else: { named: false, inPlace: true },
    if: { named: false, inPlace: true },
    items: { named: false, inPlace: false },
    not: { named: false, inPlace: true },
    oneOf: { named: false, inPlace: true },
    patternProperties: { named: true, inPlace: false },
    prefixItems: { named: false, inPlace: false },
    properties: { named: true, inPlace: false },
    propertyNames: { named: false, inPlace: false },
    then: { named: false, inPlace: true },
    unevaluatedItems: { named: false, inPlace: false },
    unevaluatedProperties: { named: false, inPlace: false },
};

/** One schema, or a list of them: `items` is either, as draft 7 wrote a tuple. */
function spotsOf(value: unknown, path: JSONPath, inPlace: boolean): SchemaSpot[] {
    if (isRecord(value)) {
        return [{ path, schema: value, inPlace }];
    }

    if (!Array.isArray(value)) {
        return [];
    }

    return value.flatMap((each, index) => spotsOf(each, [...path, index], inPlace));
}

/** Schemas by name: each name a schema of its own. */
function namedSpotsOf(value: unknown, path: JSONPath, inPlace: boolean): SchemaSpot[] {
    if (!isRecord(value)) {
        return [];
    }

    return Object.entries(value).flatMap(([name, each]) => spotsOf(each, [...path, name], inPlace));
}

/** The schemas one schema holds directly. */
export function childSpotsOf(spot: SchemaSpot): SchemaSpot[] {
    return Object.entries(spot.schema).flatMap(([key, value]) => {
        const holder = HOLDER_OF_KEYWORD[key];

        if (holder === undefined) {
            return [];
        }

        const read = holder.named ? namedSpotsOf : spotsOf;

        return read(value, [...spot.path, key], holder.inPlace);
    });
}

/** Every schema inside a schema, the schema itself first. */
export function allSpotsOf(schema: unknown): SchemaSpot[] {
    const found: SchemaSpot[] = [];
    const pending: SchemaSpot[] = isRecord(schema) ? [{ path: [], schema, inPlace: false }] : [];

    for (let spot = pending.pop(); spot !== undefined; spot = pending.pop()) {
        found.push(spot);
        pending.push(...childSpotsOf(spot).reverse());
    }

    return found;
}
