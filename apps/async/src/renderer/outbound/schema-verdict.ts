import type { MessagePayloadType } from '@mandor/schema';
import { validateTemplateText, type TemplateIssue } from '@mandor/validate';

import { wirePayload } from '../events/wire-payload.js';

/**
 * What the text about to leave promises against its schema, checked exactly as it will
 * travel: comments gone, and every `{{var}}` standing for whatever the schema asks for. The
 * values are never resolved here — a value of the environment is a secret, and this window is
 * not where one resolves. Main is who judges the frame truly resolved, for the mark.
 */
export function schemaVerdict(input: {
    payloadType: MessagePayloadType;
    payload: string;
    schema: string | undefined;
}): TemplateIssue[] {
    if (input.payloadType !== 'json' || input.schema === undefined || input.schema.trim() === '') {
        return [];
    }

    return validateTemplateText(input.schema, wirePayload(input.payload, 'json'));
}

/** The verdict of the event a composer holds; a composer with no event breaks nothing. */
export function eventVerdict(
    event: { payload: string; schema: string } | undefined,
    payloadType: MessagePayloadType,
): TemplateIssue[] {
    if (event === undefined) {
        return [];
    }

    return schemaVerdict({ payload: event.payload, payloadType, schema: event.schema });
}
