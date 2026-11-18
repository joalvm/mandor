import type { JsonError } from 'json-schema-library';

import { placeOf, type SchemaPlaces } from '../schema-places/schema-places.js';

import { MESSAGE_OF_KEYWORD, PARAMS_OF_KEYWORD, pathOf, type Refusal } from './issue-words.js';
import { isRecord, type SchemaIssue } from './schema-issue.js';

/** The rule of JSON Schema behind each code of the checker. */
const KEYWORD_OF_CODE: Record<string, string> = {
    'additional-items-error': 'additionalItems',
    'any-of-error': 'anyOf',
    'const-error': 'const',
    'contains-max-error': 'maxContains',
    'contains-min-error': 'minContains',
    'enum-error': 'enum',
    'exclusive-maximum-error': 'exclusiveMaximum',
    'exclusive-minimum-error': 'exclusiveMinimum',
    'invalid-data-error': 'false',
    'invalid-property-name-error': 'propertyNames',
    'max-items-error': 'maxItems',
    'max-length-error': 'maxLength',
    'max-properties-error': 'maxProperties',
    'maximum-error': 'maximum',
    'min-items-error': 'minItems',
    'min-length-error': 'minLength',
    'min-properties-error': 'minProperties',
    'minimum-error': 'minimum',
    'missing-dependency-error': 'dependentRequired',
    'multiple-of-error': 'multipleOf',
    'multiple-one-of-error': 'oneOf',
    'no-additional-properties-error': 'additionalProperties',
    'not-error': 'not',
    'one-of-error': 'oneOf',
    'pattern-error': 'pattern',
    'ref-error': '$ref',
    'required-property-error': 'required',
    'type-error': 'type',
    'unevaluated-items-error': 'unevaluatedItems',
    'unevaluated-property-error': 'unevaluatedProperties',
    'unique-items-error': 'uniqueItems',
};

/**
 * One code of the checker covers two spellings of a rule: the dependency written as draft 7
 * wrote it, an array closed with `items: false` beside its tuple, and a `contains` that names
 * no count, which asks for one match.
 */
const SPELLING_OF_KEYWORD: Partial<Record<string, (part: Record<string, unknown>) => string>> = {
    dependentRequired: (part) =>
        'dependentRequired' in part ? 'dependentRequired' : 'dependencies',
    false: (part) => (part['items'] === false ? 'items' : 'false'),
    minContains: (part) => ('minContains' in part ? 'minContains' : 'contains'),
};

/** Each format answers with a code of its own; the rule behind them all is `format`. */
const FORMAT_CODE = /^format-.+-error$/u;

/** The rule a code names, as the part of the schema spells it. */
function keywordOf(code: string, part: Record<string, unknown>): string {
    const keyword = FORMAT_CODE.test(code) ? 'format' : (KEYWORD_OF_CODE[code] ?? code);

    return SPELLING_OF_KEYWORD[keyword]?.(part) ?? keyword;
}

/** Where the rule sits in the schema; a missing key points at its own entry of `required`. */
function schemaPathOf(
    refusal: Refusal,
    places: SchemaPlaces,
    params: Record<string, string>,
): string {
    const place = placeOf(places, refusal.part, refusal.keyword);
    const required = refusal.part['required'];

    if (refusal.keyword !== 'required' || place === '' || !Array.isArray(required)) {
        return place;
    }

    return `${place}/${String(required.indexOf(params['property']))}`;
}

/** One refusal of the checker, worded as an issue of the package. */
export function issueOf(error: JsonError, places: SchemaPlaces): SchemaIssue {
    const data = error.data as Record<string, unknown>;
    const part = isRecord(data['schema']) ? data['schema'] : {};
    // The library types a code with its table of messages; what it reports is always the code.
    const keyword = keywordOf(error.code as string, part);
    const refusal: Refusal = { data, part, value: data['value'], keyword };
    const params = PARAMS_OF_KEYWORD[keyword]?.(refusal) ?? {};

    return {
        path: pathOf(data['pointer']),
        keyword,
        params,
        schemaPath: schemaPathOf(refusal, places, params),
        message: MESSAGE_OF_KEYWORD[keyword]?.(params) ?? error.message,
    };
}
