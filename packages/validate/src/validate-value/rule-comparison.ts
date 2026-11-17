/** What a rule asked against what it got, each as one short text a list sets side by side. */
export type RuleComparison = {
    expected: string;
    /** What the value had; absent when only the value itself can say it. */
    received?: string | undefined;
};

type Params = Readonly<Record<string, string>>;

/** A bound the schema set, written with the sign of the rule, against the number it got. */
function bound(sign: string): (params: Params) => RuleComparison {
    return (params) => ({
        expected: `${sign} ${String(params['limit'])}`,
        received: params['actual'],
    });
}

/** A text the value had, written as JSON the way the value shows it. */
function quoted(text: string | undefined): string | undefined {
    return text === undefined ? undefined : JSON.stringify(text);
}

/**
 * The rules whose refusal reads as a comparison, each with what it asked and what it got. A
 * rule absent here — a missing property, an extra one, a branch no option matched — has no
 * pair to set side by side, and is said in words.
 */
const COMPARISON_OF_KEYWORD: Partial<Record<string, (params: Params) => RuleComparison>> = {
    const: (params) => ({ expected: String(params['expected']) }),
    enum: (params) => ({ expected: String(params['allowed']) }),
    exclusiveMaximum: bound('<'),
    exclusiveMinimum: bound('>'),
    format: (params) => ({
        expected: String(params['format']),
        received: quoted(params['actual']),
    }),
    maxItems: bound('≤'),
    maxLength: bound('≤'),
    maxProperties: bound('≤'),
    maximum: bound('≤'),
    minItems: bound('≥'),
    minLength: bound('≥'),
    minProperties: bound('≥'),
    minimum: bound('≥'),
    pattern: (params) => ({
        expected: String(params['pattern']),
        received: quoted(params['actual']),
    }),
    type: (params) => ({
        expected: String(params['expected']).replaceAll(', ', ' | '),
        received: params['received'],
    }),
};

/**
 * A broken rule as what it asked against what it got, or nothing when it has no such pair. The
 * texts are the schema's own — types, bounds, formats — and need no language of their own.
 */
export function comparisonOf(rule: {
    keyword: string;
    params: Params;
}): RuleComparison | undefined {
    return COMPARISON_OF_KEYWORD[rule.keyword]?.(rule.params);
}
