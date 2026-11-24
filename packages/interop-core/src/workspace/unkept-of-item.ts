import type { CollectionItem } from '@mandor/schema';
import { z } from 'zod';

import type { OutlineLoss } from './outline-kind.js';
import { ownScriptsLossOf, type LevelNote, type UnkeptLevels } from './unkept-parts.js';

/**
 * What a row needs to know of a request. A request that does not read is not the outline's to
 * refuse, so what cannot be read counts as not held.
 */
const requestPartsSchema = z.object({
    body: z.object({ type: z.string() }).default({ type: 'none' }).catch({ type: 'none' }),
    bodySchema: z.string().default('').catch(''),
    responseSchemas: z.record(z.string(), z.unknown()).default({}).catch({}),
    examples: z
        .array(z.object({ schema: z.string().default('').catch('') }).catch({ schema: '' }))
        .default([])
        .catch([]),
    settings: z.record(z.string(), z.unknown()).default({}).catch({}),
    scripts: z.record(z.string(), z.unknown()).default({}).catch({}),
});

const messagePartsSchema = z.object({
    channel: z.string().default('').catch(''),
    description: z.string().default('').catch(''),
    schema: z.string().default('').catch(''),
    expectAck: z.unknown().optional(),
});

function settingsLossOf(settings: Record<string, unknown>, unkept: UnkeptLevels): OutlineLoss[] {
    const kept = unkept.request?.settingsKept;

    if (kept === undefined) {
        return [];
    }

    const held = Object.entries(settings).filter(([, value]) => value !== undefined);

    return held.some(([key]) => !kept.some((name) => name === key)) ? ['settingsDropped'] : [];
}

/** Whether the request holds a JSON Schema, of its body or of any answer. */
function holdsSchemas(parts: z.output<typeof requestPartsSchema>): boolean {
    return (
        parts.bodySchema !== '' ||
        Object.keys(parts.responseSchemas).length > 0 ||
        parts.examples.some(({ schema }) => schema !== '')
    );
}

function exampleLossesOf(
    parts: z.output<typeof requestPartsSchema>,
    unkept: UnkeptLevels,
): (OutlineLoss | undefined)[] {
    if (parts.examples.length === 0) {
        return [];
    }

    return [unkept.request?.examples, ...graphqlLossOf(parts, unkept)];
}

function graphqlLossOf(
    { body }: z.output<typeof requestPartsSchema>,
    unkept: UnkeptLevels,
): (OutlineLoss | undefined)[] {
    if (body.type !== 'graphql') {
        return [];
    }

    return [unkept.request?.graphqlExamples];
}

function requestLossesOf(item: CollectionItem, unkept: UnkeptLevels): (OutlineLoss | undefined)[] {
    const parts = requestPartsSchema.parse(item.body);
    const { settings, scripts } = parts;

    return [
        ...(item.tags.length > 0 ? [unkept.request?.tags] : []),
        ...exampleLossesOf(parts, unkept),
        ...(holdsSchemas(parts) ? [unkept.request?.schemas] : []),
        ...settingsLossOf(settings, unkept),
        ...ownScriptsLossOf(scripts, unkept),
    ];
}

function messageLossesOf(item: CollectionItem, unkept: UnkeptLevels): (OutlineLoss | undefined)[] {
    const { channel, description, schema, expectAck } = messagePartsSchema.parse(item.body);
    const hasDetails = [channel, description, schema].some((text) => text !== '');

    return [
        unkept.message?.byName,
        ...(hasDetails || expectAck !== undefined ? [unkept.message?.details] : []),
    ];
}

const LOSSES = new Map([
    ['request', requestLossesOf],
    ['message', messageLossesOf],
]);

/** What the format loses of this item, the row's to say; the item still leaves. */
export function itemNoteOf(item: CollectionItem, unkept: UnkeptLevels): LevelNote {
    const losses = (LOSSES.get(item.kind)?.(item, unkept) ?? []).filter(
        (loss) => loss !== undefined,
    );

    return losses.length === 0 ? {} : { unkept: [...new Set(losses)] };
}
