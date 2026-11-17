import { useMessages } from '@mandor/i18n';
import type { RequestItem } from '@mandor/schema';
import { useToast } from '@mandor/ui';
import {
    applyGeneratedPayload,
    applyGeneratedSchema,
    schemaOfDraft,
    withSchemaToValue,
} from '@mandor/validate';

import { changesOfBody } from '../lib/body-change.js';

type BodySchemaGeneration = {
    /** The body the schema asks for, or nothing while there is no json body or no schema. */
    generateBody: (() => void) | undefined;
    /** The schema the body tells, or nothing while the body is not json. */
    generateSchema: (() => void) | undefined;
};

/**
 * The two generations between the body of a request and its schema, each under the protection
 * the messages of Realtime carry: what holds work of the user's own is replaced only once they
 * say so. Only a json body has a shape to infer, and only a written schema has one to give.
 */
export function useBodySchemaGeneration(
    request: RequestItem,
    onChange: (changes: Partial<RequestItem>) => void,
): BodySchemaGeneration {
    const words = useMessages('editor');
    const toast = useToast();
    const { body } = request;
    const schema = request.bodySchema ?? '';

    if (body.type !== 'json') {
        return { generateBody: undefined, generateSchema: undefined };
    }

    const { content } = body;
    const ask = { notify: toast.notify, words };

    function generateSchema(): void {
        applyGeneratedSchema({
            apply: (generated) => {
                onChange({ bodySchema: generated });
            },
            ask,
            generated: schemaOfDraft(content),
            payload: content,
            schema,
        });
    }

    function generateBody(): void {
        withSchemaToValue((schemaToValue) => {
            applyGeneratedPayload({
                apply: (generated) => {
                    onChange(changesOfBody(request, { content: generated, type: 'json' }));
                },
                ask,
                generated: schemaToValue(schema),
                payload: content,
                schema,
            });
        });
    }

    return {
        generateBody: schema.trim() === '' ? undefined : generateBody,
        generateSchema,
    };
}
