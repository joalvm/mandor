import { isRecord } from '../validate-value/schema-issue.js';

/**
 * Where each part of a schema sits inside it, as a JSON Pointer. The checker names the part
 * that refused a value by the object itself, so the place is found by identity; the editor
 * needs the place to underline the rule.
 */
export type SchemaPlaces = {
    readonly byPart: WeakMap<object, string>;
    readonly parts: readonly (readonly [Record<string, unknown>, string])[];
};

/** The places while they are being found: the list still grows. */
type Placing = {
    byPart: WeakMap<object, string>;
    parts: (readonly [Record<string, unknown>, string])[];
};

/** Keywords whose value is data, not schema: nothing below them is a part of the schema. */
const DATA_KEYWORDS = new Set(['const', 'default', 'enum', 'examples']);

export function schemaPlacesOf(schema: unknown): SchemaPlaces {
    const places: Placing = { byPart: new WeakMap<object, string>(), parts: [] };

    placeAll(schema, '', places);

    return places;
}

/** The place of the keyword in the part that holds it, or empty when the part is not found. */
export function placeOf(places: SchemaPlaces, part: unknown, keyword: string): string {
    if (!isRecord(part)) {
        return '';
    }

    const pointer = places.byPart.get(part) ?? lookalikeOf(places, part, keyword);

    return pointer === undefined ? '' : `${pointer}/${segmentOf(keyword)}`;
}

/** One JSON Pointer segment: `~` and `/` are the two characters a segment has to escape. */
export function segmentOf(key: string): string {
    return key.replaceAll('~', '~0').replaceAll('/', '~1');
}

function placeAll(value: unknown, pointer: string, places: Placing): void {
    if (Array.isArray(value)) {
        value.forEach((each, index) => {
            placeAll(each, `${pointer}/${String(index)}`, places);
        });

        return;
    }

    if (!isRecord(value)) {
        return;
    }

    places.byPart.set(value, pointer);
    places.parts.push([value, pointer]);

    for (const [key, each] of Object.entries(value)) {
        if (!DATA_KEYWORDS.has(key)) {
            placeAll(each, `${pointer}/${segmentOf(key)}`, places);
        }
    }
}

/**
 * Where a part that is a copy sits: the checker rebuilds a part when it folds a reference into
 * the root, and the first part that writes the same keyword the same way is the best place.
 */
function lookalikeOf(
    places: SchemaPlaces,
    part: Record<string, unknown>,
    keyword: string,
): string | undefined {
    if (!(keyword in part)) {
        return undefined;
    }

    const wanted = JSON.stringify(part[keyword]);

    return places.parts.find(([each]) => JSON.stringify(each[keyword]) === wanted)?.[1];
}
