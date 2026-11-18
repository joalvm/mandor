import { comparisonOf, placesIn } from '@mandor/validate';

/** A broken rule as the dock reads it, without the words the mounter says it in. */
type FactsSource = {
    keyword: string;
    params: Readonly<Record<string, string>>;
    path: string;
    schemaPath: string;
};

/** What the rule asked against what came, and the value itself when it says more than that. */
export type IssuePair = {
    expected: string;
    received: string;
    /** The value as it came, absent when it is what `received` already says. */
    value: string | undefined;
};

/** What a row of the dock can tell beyond its message. */
export type IssueFacts = {
    /** The line of the schema the rule is written on, counted from 1. */
    line: number | undefined;
    /** The rule as a comparison; absent when it has no two halves to set side by side. */
    pair: IssuePair | undefined;
};

/**
 * Reads the schema and the value it judged once, and answers for each broken rule where it is
 * written and what it asked against what came. A rule that does not read as a comparison, or
 * whose value cannot be read, keeps only its line, and its message says the rest.
 */
export function issueFactsIn(
    schema: string,
    judged: string | undefined,
): (issue: FactsSource) => IssueFacts {
    const ruleAt = placesIn(schema);
    const valueAt = placesIn(judged ?? '');

    return (issue) => ({
        line: ruleAt(issue.schemaPath)?.line,
        pair: pairOf(issue, valueAt(issue.path)?.excerpt),
    });
}

function pairOf(issue: FactsSource, excerpt: string | undefined): IssuePair | undefined {
    const comparison = comparisonOf(issue);
    const received = comparison?.received ?? excerpt;

    if (comparison === undefined || received === undefined) {
        return undefined;
    }

    return {
        expected: comparison.expected,
        received,
        value: excerpt === received ? undefined : excerpt,
    };
}
