import type { ActivityRecord } from '@mandor/ipc';
import { onOriginLeft } from '@mandor/shell';
import { loadSchemaChecker, validateTemplateText, type TemplateIssue } from '@mandor/validate';

import { inboundSchemas } from './inbound-schema.js';
import { eventNameOf } from './lib/event-name.js';
import { isParsablePayload } from './lib/parsable-payload.js';

/** The refusals of one inbound frame, in the words of the checker. */
export type VerdictIssue = TemplateIssue;

/** One verdict per entry, for as long as the session holds it. */
const CACHE_LIMIT = 512;
const CACHE = new Map<string, TemplateIssue[]>();

// What an origin's frames were judged to be is no use to the next one.
onOriginLeft(() => {
    CACHE.clear();
});

/**
 * What an inbound frame must look like before the judge reads it: text JSON within the limit.
 * Both views that judge — the row and the schema mark of the filter — ask this first, so a
 * frame is either judged by both or by neither.
 */
export function judgeable(record: ActivityRecord): boolean {
    return record.direction === 'in' && isParsablePayload(record.data);
}

/** The verdict an entry was given, for the views that open it after the row judged it. */
export function inboundVerdictOf(entry: { id: string }): TemplateIssue[] | undefined {
    return CACHE.get(entry.id);
}

function remember(id: string, issues: TemplateIssue[]): void {
    if (CACHE.size >= CACHE_LIMIT) {
        const oldest = CACHE.keys().next();

        if (oldest.done !== true) {
            CACHE.delete(oldest.value);
        }
    }

    CACHE.set(id, issues);
}

/**
 * What the schema judge says of one inbound frame, judged once and remembered. The verdict the
 * row shows and the one the schema mark of the filter reads come from here, so a frame is
 * judged once no matter who asked first.
 */
export async function judgeInbound(
    entry: { id: string },
    record: ActivityRecord,
): Promise<TemplateIssue[]> {
    const kept = CACHE.get(entry.id);

    if (kept !== undefined) {
        return kept;
    }

    const schemas = inboundSchemas();
    // The event the transport named, else the one the payload names.
    const channel = record.event ?? eventNameOf(record.data);

    if (schemas === undefined || channel === null) {
        remember(entry.id, []);

        return [];
    }

    const schema = await schemas.schemaForChannel(channel);

    if (schema === undefined || schema.trim() === '') {
        remember(entry.id, []);

        return [];
    }

    await loadSchemaChecker();

    const issues = validateTemplateText(schema, record.data);

    remember(entry.id, issues);

    return issues;
}
