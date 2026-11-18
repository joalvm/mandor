/**
 * The facts one refusal is worded from: what the checker reported, the part of the schema that
 * refused, and the value it refused.
 */
export type Refusal = {
    data: Record<string, unknown>;
    part: Record<string, unknown>;
    value: unknown;
    keyword: string;
};

type Params = Record<string, string>;

/** The type of a JSON value as a schema names it: a whole number is an `integer`. */
export function jsonTypeOf(value: unknown): string {
    if (value === null) {
        return 'null';
    }

    if (Array.isArray(value)) {
        return 'array';
    }

    return typeof value === 'number' && Number.isInteger(value) ? 'integer' : typeof value;
}

/** A list the schema wrote, as one line of text: a word stays a word, a value its JSON. */
function listOf(value: unknown): string {
    const list = Array.isArray(value) ? value : [value];

    return list.map((each) => (typeof each === 'string' ? each : JSON.stringify(each))).join(', ');
}

/** The last segment of a pointer into the value: the key or the rank the rule refused. */
function lastSegmentOf(pointer: unknown): string {
    const text = String(pointer);

    return text.slice(text.lastIndexOf('/') + 1);
}

/** A pointer of the checker, `#/a/b`, as the path of the value, `/a/b`. */
export function pathOf(pointer: unknown): string {
    return String(pointer).replace(/^#/u, '');
}

function textOf(value: unknown): string {
    return typeof value === 'string' ? value : JSON.stringify(value);
}

/** A bound the schema set on a size, with the size the value has. */
function sizeOf(refusal: Refusal): Params {
    return { limit: textOf(refusal.part[refusal.keyword]), actual: textOf(refusal.data['length']) };
}

/** A bound the schema set on a number, with the number the value is. */
function boundOf(refusal: Refusal): Params {
    return { limit: textOf(refusal.part[refusal.keyword]), actual: textOf(refusal.value) };
}

/** The key the object lacks for the keys it has: which ones ask for it is read from the schema. */
function dependencyOf(refusal: Refusal): Params {
    const missing = String(refusal.data['missingProperty']);
    const rules = refusal.part[refusal.keyword] as Record<string, unknown>;
    const value = refusal.value as Record<string, unknown>;
    const holders = Object.entries(rules)
        .filter(([key, needs]) => key in value && Array.isArray(needs) && needs.includes(missing))
        .map(([key]) => key);

    return { property: missing, dependency: holders.join(', ') };
}

/** What each rule says it asked and what it got. A rule absent here says nothing more. */
export const PARAMS_OF_KEYWORD: Partial<Record<string, (refusal: Refusal) => Params>> = {
    $ref: (refusal) => ({ ref: textOf(refusal.data['ref']) }),
    additionalItems: (refusal) => ({ index: textOf(refusal.data['key']) }),
    additionalProperties: (refusal) => ({
        property: textOf(refusal.data['property'] ?? refusal.data['key']),
    }),
    const: (refusal) => ({ expected: JSON.stringify(refusal.part['const']) }),
    dependencies: dependencyOf,
    dependentRequired: dependencyOf,
    enum: (refusal) => ({ allowed: listOf(refusal.part['enum']) }),
    exclusiveMaximum: boundOf,
    exclusiveMinimum: boundOf,
    format: (refusal) => ({
        format: textOf(refusal.part['format']),
        actual: textOf(refusal.value),
    }),
    maxContains: (refusal) => ({ limit: textOf(refusal.part['maxContains']) }),
    maxItems: sizeOf,
    maxLength: sizeOf,
    maxProperties: sizeOf,
    maximum: boundOf,
    minContains: (refusal) => ({ limit: textOf(refusal.part['minContains']) }),
    minItems: sizeOf,
    minLength: sizeOf,
    minProperties: sizeOf,
    minimum: boundOf,
    multipleOf: boundOf,
    pattern: (refusal) => ({
        pattern: textOf(refusal.part['pattern']),
        actual: textOf(refusal.value),
    }),
    propertyNames: (refusal) => ({ property: textOf(refusal.data['property']) }),
    required: (refusal) => ({ property: textOf(refusal.data['key']) }),
    type: (refusal) => ({
        expected: listOf(refusal.data['expected']),
        received: jsonTypeOf(refusal.value),
    }),
    unevaluatedItems: (refusal) => ({ index: lastSegmentOf(refusal.data['pointer']) }),
    unevaluatedProperties: (refusal) => ({ property: lastSegmentOf(refusal.data['pointer']) }),
    uniqueItems: (refusal) => ({ duplicate: pathOf(refusal.data['duplicatePointer']) }),
};

/** How each rule says, in the checker's English, that the value did not meet it. */
export const MESSAGE_OF_KEYWORD: Partial<Record<string, (params: Params) => string>> = {
    $ref: (p) => `cannot resolve the reference ${String(p['ref'])}`,
    additionalItems: () => 'must NOT have more items than the tuple',
    additionalProperties: (p) => `must NOT have additional property '${String(p['property'])}'`,
    anyOf: () => 'must match a schema in anyOf',
    const: () => 'must be equal to constant',
    contains: () => 'must contain a matching item',
    dependencies: (p) =>
        `must have property '${String(p['property'])}' when '${String(p['dependency'])}' is present`,
    dependentRequired: (p) =>
        `must have property '${String(p['property'])}' when '${String(p['dependency'])}' is present`,
    enum: () => 'must be equal to one of the allowed values',
    exclusiveMaximum: (p) => `must be < ${String(p['limit'])}`,
    exclusiveMinimum: (p) => `must be > ${String(p['limit'])}`,
    false: () => 'must NOT be present',
    format: (p) => `must match format "${String(p['format'])}"`,
    items: () => 'must NOT have more items than the tuple',
    maxContains: (p) => `must contain at most ${String(p['limit'])} matching items`,
    maxItems: (p) => `must NOT have more than ${String(p['limit'])} items`,
    maxLength: (p) => `must NOT have more than ${String(p['limit'])} characters`,
    maxProperties: (p) => `must NOT have more than ${String(p['limit'])} properties`,
    maximum: (p) => `must be <= ${String(p['limit'])}`,
    minContains: (p) => `must contain at least ${String(p['limit'])} matching items`,
    minItems: (p) => `must NOT have fewer than ${String(p['limit'])} items`,
    minLength: (p) => `must NOT have fewer than ${String(p['limit'])} characters`,
    minProperties: (p) => `must NOT have fewer than ${String(p['limit'])} properties`,
    minimum: (p) => `must be >= ${String(p['limit'])}`,
    multipleOf: (p) => `must be a multiple of ${String(p['limit'])}`,
    not: () => 'must NOT be valid against not',
    oneOf: () => 'must match exactly one schema in oneOf',
    pattern: (p) => `must match pattern "${String(p['pattern'])}"`,
    propertyNames: (p) => `property name '${String(p['property'])}' is invalid`,
    required: (p) => `must have required property '${String(p['property'])}'`,
    type: (p) => `must be ${String(p['expected']).replaceAll(', ', ' or ')}`,
    unevaluatedItems: () => 'must NOT have unevaluated items',
    unevaluatedProperties: (p) => `must NOT have unevaluated property '${String(p['property'])}'`,
    uniqueItems: (p) => `must NOT have duplicate items (same as ${String(p['duplicate'])})`,
};
