import { keepingStrictness } from '../schema-strictness/keeping-strictness.js';

import { schemaTriviality } from './schema-triviality.js';

/** The words either question needs, and where the question goes. Both belong to the screen. */
export type ReplaceAsk = {
    notify: (request: {
        action: { label: string; onSelect: () => void };
        detail: string;
        title: string;
        tone: 'warning';
    }) => void;
    words: (
        key:
            | 'replacePayloadDetail'
            | 'replacePayloadTitle'
            | 'replaceSchema'
            | 'replaceSchemaDetail'
            | 'replaceSchemaTitle',
    ) => string;
};

/**
 * Applies the schema the body generates, or asks before replacing: a schema that says more than
 * the body can rebuild is work worth keeping, and the answer of the question is who does the
 * replacement. A body the parser cannot read generates nothing — `generated` arrives as `null`
 * and nothing is applied or asked. What is applied keeps the options the old schema held for
 * every object. The two screens that generate from the body share the decision and the question.
 */
export function applyGeneratedSchema(input: {
    apply: (value: string) => void;
    ask: ReplaceAsk;
    generated: string | null;
    payload: string;
    schema: string;
}): void {
    if (input.generated === null) {
        return;
    }

    const generated = keepingStrictness(input.schema, input.generated);

    const apply = (): void => {
        input.apply(generated);
    };

    if (schemaTriviality(input.payload, input.schema) !== 'hasMore') {
        apply();

        return;
    }

    input.ask.notify({
        action: { label: input.ask.words('replaceSchema'), onSelect: apply },
        detail: input.ask.words('replaceSchemaDetail'),
        title: input.ask.words('replaceSchemaTitle'),
        tone: 'warning',
    });
}
