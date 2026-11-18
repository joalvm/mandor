import { withSchemaChecker } from '../schema-checker/schema-checker.js';
import { validateTemplateText } from '../validate-template/validate-template.js';

import type { ReplaceAsk } from './apply-generated-schema.js';

/**
 * Applies the body the schema asks for, or asks before replacing — the symmetric protection of
 * the schema side. A body that is empty, or one the schema already accepts, is nothing to
 * protect: the generation applies without asking, because a body the schema generates is what
 * a redraw of it would be. Anything else is writing of the user's own, and the answer of the
 * question is who does the replacement.
 *
 * The caller only reaches here with a schema to generate from and for a json payload — for text
 * and binary there is nothing to infer — so the verdict reads it as the JSONC it is written in,
 * with every `{{var}}` standing for whatever the schema asks for.
 */
export function applyGeneratedPayload(input: {
    apply: (value: string) => void;
    ask: ReplaceAsk;
    generated: string;
    payload: string;
    schema: string;
}): void {
    const generated = input.generated;
    const apply = (): void => {
        input.apply(generated);
    };

    if (input.payload.trim() === '') {
        apply();

        return;
    }

    // Whether the body already meets its schema is the checker's answer: without it, the body
    // would read as met and be replaced unasked.
    withSchemaChecker(() => {
        if (validateTemplateText(input.schema, input.payload).length === 0) {
            apply();

            return;
        }

        input.ask.notify({
            action: { label: input.ask.words('replaceSchema'), onSelect: apply },
            detail: input.ask.words('replacePayloadDetail'),
            title: input.ask.words('replacePayloadTitle'),
            tone: 'warning',
        });
    });
}
