import type { z } from 'zod';

import type { BrunoBody, BrunoFormRow } from './bruno-tree.js';
import {
    fileVariantSchema,
    formEntrySchema,
    type graphqlSchema,
    type httpSchema,
} from './opencollection-schema.js';

type Bodies = z.output<typeof httpSchema>['body'];
type GraphqlBodies = z.output<typeof graphqlSchema>['body'];
type Entry = z.output<typeof formEntrySchema>;

const EMPTY: Omit<BrunoBody, 'type'> = { text: '', variables: '', rows: [], file: '' };

/** The one a list of variants sends: the one marked, or the first. */
function chosen<T extends { selected?: boolean | null | undefined }>(variants: readonly T[]) {
    return variants.find((variant) => variant.selected === true) ?? variants[0];
}

function entriesOf(data: unknown): Entry[] {
    const parsed = formEntrySchema.array().safeParse(data);

    return parsed.success ? parsed.data : [];
}

/** The first of the files a field names; a text is the value itself. */
function valueOf(value: Entry['value']): string {
    return typeof value === 'string' ? value : (value?.[0] ?? '');
}

function rowOf(entry: Entry): BrunoFormRow {
    const isFile = entry.type === 'file';
    const value = valueOf(entry.value);

    return {
        name: entry.name ?? '',
        value: isFile ? '' : value,
        disabled: entry.disabled === true,
        file: isFile ? value : '',
    };
}

function fileOf(data: unknown): string {
    const parsed = fileVariantSchema.array().safeParse(data);
    const file = parsed.success ? chosen(parsed.data) : undefined;

    return file?.filePath ?? '';
}

function rawText(data: unknown): Partial<BrunoBody> {
    return { text: typeof data === 'string' ? data : '' };
}

function formRows(data: unknown): Partial<BrunoBody> {
    return { rows: entriesOf(data).map(rowOf) };
}

/** How each body type reads its `data`: a type added to the schema must add its row here. */
const READERS = new Map<string, (data: unknown) => Partial<BrunoBody>>([
    ['json', rawText],
    ['text', rawText],
    ['xml', rawText],
    ['sparql', rawText],
    ['form-urlencoded', formRows],
    ['multipart-form', formRows],
    ['file', (data) => ({ file: fileOf(data) })],
]);

/** The body of an HTTP request, or nothing when it sends none or one this reader has no word for. */
export function httpBodyOf(bodies: Bodies): BrunoBody | undefined {
    const body = Array.isArray(bodies) ? chosen(bodies)?.body : bodies;
    const type = body?.type ?? '';
    const read = READERS.get(type);

    if (body === null || body === undefined || read === undefined) {
        return undefined;
    }

    return { type, ...EMPTY, ...read(body.data) };
}

/** The body of a GraphQL request: its query and its variables. */
export function graphqlBodyOf(bodies: GraphqlBodies): BrunoBody | undefined {
    const body = Array.isArray(bodies) ? chosen(bodies)?.body : bodies;

    if (body === null || body === undefined) {
        return undefined;
    }

    return { type: 'graphql', ...EMPTY, text: body.query ?? '', variables: body.variables ?? '' };
}
