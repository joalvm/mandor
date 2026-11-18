type SchemaLike = Record<string, unknown>;

// A sample seeds the payload editor of an imported item, and a runaway schema
// (a tree that refers to itself) would hang the import over it. Eight levels of
// nesting is more than any payload an event carries.
const MAX_DEPTH = 8;

// The floors a schema states (`minItems`, `minLength`) and the arrays nested in arrays come from
// the document, which is anyone's. A sample past these sizes is no longer something an editor shows.
const MAX_ITEMS = 64;
const MAX_LENGTH = 1024;
const MAX_VALUES = 2000;

// A pattern is the document's, and one with a quantifier inside a quantifier backtracks
// exponentially in the length of the text it is tried on. Twelve characters keep that to a
// few thousand steps, and still fit the dates and times that patterns mostly spell out.
const MAX_MATCHED_LENGTH = 12;

/** Where a sample stands: how deep it went, and how many values the whole sample has left. */
type Walk = {
    readonly depth: number;
    readonly budget: { left: number };
};

/**
 * Values that satisfy the formats validators enforce. Fixed strings rather than
 * generated ones: the sample seeds an editor, and a fresh uuid on every open
 * would churn the payload for no gain.
 */
const FORMAT_SAMPLES: Record<string, string> = {
    uuid: '00000000-0000-4000-8000-000000000000',
    'date-time': '2024-01-01T00:00:00.000Z',
    date: '2024-01-01',
    time: '00:00:00',
    duration: 'PT1S',
    email: 'user@example.com',
    hostname: 'example.com',
    ipv4: '127.0.0.1',
    ipv6: '::1',
    uri: 'https://example.com',
    'uri-reference': '/path',
    url: 'https://example.com',
    regex: '.*',
};

/** The format samples short enough to try a pattern against. */
const MATCHABLE_SAMPLES = Object.values(FORMAT_SAMPLES).filter(
    (value) => value.length <= MAX_MATCHED_LENGTH,
);

/**
 * A deterministic sample value for a JSON Schema. Same schema, same value: the
 * sample has to survive a diff, so nothing random ever enters it. It also has
 * to validate against the schema it came from — the composer checks the payload
 * the moment the item opens — so the constraints the schema states (`format`,
 * `minLength`, `exclusiveMinimum`, `minItems`) are honoured, not ignored.
 */
export function exampleOfSchema(schema: unknown): unknown {
    return sampleOf(schema, { depth: 0, budget: { left: MAX_VALUES } });
}

function sampleOf(schema: unknown, walk: Walk): unknown {
    if (!isObject(schema) || walk.depth > MAX_DEPTH || walk.budget.left <= 0) {
        return null;
    }

    walk.budget.left -= 1;

    const stated = statedValueOf(schema);

    if (stated !== null) {
        return stated;
    }

    const base = fromType(schema, walk);
    const composed = fromComposition(schema, walk);

    if (composed === undefined) {
        return base;
    }

    // Both describe the same instance, so two object samples keep the properties
    // of each, and the branch wins the keys they share. Anything else replaces.
    return isObject(base) && isObject(composed) ? { ...base, ...composed } : composed;
}

function deeper(walk: Walk): Walk {
    return { depth: walk.depth + 1, budget: walk.budget };
}

function isObject(value: unknown): value is SchemaLike {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The value the schema states outright, before its type is consulted: `example`,
 * `default`, `const` and the first `enum` entry all validate by definition.
 */
function statedValueOf(schema: SchemaLike): unknown {
    if ('example' in schema) {
        return schema['example'];
    }

    if ('default' in schema) {
        return schema['default'];
    }

    if ('const' in schema) {
        return schema['const'];
    }

    const enumValues = schema['enum'];

    return Array.isArray(enumValues) && enumValues.length > 0 ? enumValues[0] : null;
}

/** `type` may be a union such as `['string', 'null']`; the first entry wins. */
function firstTypeOf(value: unknown): unknown {
    return Array.isArray(value) ? value[0] : value;
}

function asNumber(value: unknown): number | undefined {
    return typeof value === 'number' ? value : undefined;
}

/** One sample per declared property, keyed the same way the schema keys them. */
function sampleObject(properties: unknown, walk: Walk): unknown {
    if (!isObject(properties)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(properties).map(([key, value]) => [key, sampleOf(value, deeper(walk))]),
    );
}

type Sampler = (schema: SchemaLike, walk: Walk) => unknown;

/** Stops at the last item the budget pays for, rather than padding the rest with nulls. */
function sampleArray(schema: SchemaLike, walk: Walk): unknown {
    const items = Math.min(MAX_ITEMS, Math.max(1, asNumber(schema['minItems']) ?? 1));
    const sample: unknown[] = [];

    while (sample.length < items && walk.budget.left > 0) {
        sample.push(sampleOf(schema['items'], deeper(walk)));
    }

    return sample;
}

/** How each type a schema can declare is sampled; the map holds keys of any kind, not only text. */
const SAMPLERS = new Map<unknown, Sampler>([
    ['object', (schema, walk) => sampleObject(schema['properties'], walk)],
    ['array', sampleArray],
    ['string', sampleString],
    ['integer', sampleNumber],
    ['number', sampleNumber],
    ['boolean', () => false],
    ['null', () => null],
]);

function fromType(schema: SchemaLike, walk: Walk): unknown {
    const sample = SAMPLERS.get(firstTypeOf(schema['type']));

    if (sample !== undefined) {
        return sample(schema, walk);
    }

    // An untyped schema that still carries properties is an object in
    // practice; anything else has nothing to build a sample from alone.
    return isObject(schema['properties']) ? fromType({ ...schema, type: 'object' }, walk) : null;
}

/**
 * `oneOf` and `anyOf` are satisfied by their first branch, and `allOf` by every
 * branch at once, so its object samples merge. `undefined` when there was no
 * composition to draw from, which is not the same as a sample of `null`.
 */
function fromComposition(schema: SchemaLike, walk: Walk): unknown {
    const all = schema['allOf'];

    if (Array.isArray(all)) {
        const samples = all.map((entry) => sampleOf(entry, deeper(walk)));

        return samples.every(isObject) ? Object.assign({}, ...samples) : samples[0];
    }

    const branches: unknown = schema['oneOf'] ?? schema['anyOf'];

    if (!Array.isArray(branches) || branches.length === 0) {
        return undefined;
    }

    return sampleOf(branches[0], deeper(walk));
}

function sampleString(schema: SchemaLike): string {
    const format = schema['format'];
    const sample = typeof format === 'string' ? FORMAT_SAMPLES[format] : undefined;

    if (sample !== undefined) {
        return sample;
    }

    // A `pattern` cannot be inverted, but documents mostly use it to spell out a
    // date or a time by hand, so the short format samples are tried against it before
    // giving up. Padding to a length floor is only safe with no pattern to break.
    if (typeof schema['pattern'] === 'string') {
        return matchingSample(schema['pattern']);
    }

    return 'x'.repeat(Math.min(MAX_LENGTH, asNumber(schema['minLength']) ?? 0));
}

function matchingSample(pattern: string): string {
    let regex: RegExp;

    try {
        regex = new RegExp(pattern, 'u');
    } catch {
        // An unsupported flavour of regex (a .NET or PCRE extension, say) is not
        // the import's problem: the user edits the value anyway.
        return '';
    }

    return MATCHABLE_SAMPLES.find((value) => regex.test(value)) ?? '';
}

/**
 * Zero unless the schema forbids it. `exclusiveMinimum: 0` is how documents
 * usually say "an id", and a sample of `0` made every such item open with a
 * validation error.
 */
function sampleNumber(schema: SchemaLike): number {
    const minimum = asNumber(schema['minimum']) ?? 0;
    const exclusive = asNumber(schema['exclusiveMinimum']);

    return Math.max(0, exclusive === undefined ? minimum : Math.max(minimum, exclusive + 1));
}
