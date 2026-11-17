import type { z } from 'zod';

import type { BruRow, bruRequestSchema } from './bru-schema.js';
import type { BrunoBody, BrunoFormRow } from './bruno-tree.js';
import { valueOfRow } from './read-bru-rows.js';

type Blocks = NonNullable<z.output<typeof bruRequestSchema>['body']>;
type Files = NonNullable<Blocks['file']>;
type Reading = Partial<BrunoBody> & { type: string };

const EMPTY: Omit<BrunoBody, 'type'> = { text: '', variables: '', rows: [], file: '' };

function rowOf(row: BruRow): BrunoFormRow {
    const isFile = row.type === 'file';
    const value = valueOfRow(row.value);

    return {
        name: row.name ?? '',
        value: isFile ? '' : value,
        disabled: row.enabled === false,
        file: isFile ? value : '',
    };
}

/** The file a body sends: the one marked as selected, or the first. */
function fileOf(files: Files | null | undefined): string {
    const list = files ?? [];

    return (list.find((file) => file.selected === true) ?? list[0])?.filePath ?? '';
}

/** How each mode of `.bru` reads its block: a mode Mandor has no body for is not listed. */
const READERS = new Map<string, (blocks: Blocks) => Reading>([
    ['json', (blocks) => ({ type: 'json', text: blocks.json ?? '' })],
    ['text', (blocks) => ({ type: 'text', text: blocks.text ?? '' })],
    ['xml', (blocks) => ({ type: 'xml', text: blocks.xml ?? '' })],
    ['sparql', (blocks) => ({ type: 'sparql', text: blocks.sparql ?? '' })],
    [
        'graphql',
        (blocks) => ({
            type: 'graphql',
            text: blocks.graphql?.query ?? '',
            variables: blocks.graphql?.variables ?? '',
        }),
    ],
    [
        'formUrlEncoded',
        (blocks) => ({ type: 'form-urlencoded', rows: (blocks.formUrlEncoded ?? []).map(rowOf) }),
    ],
    [
        'multipartForm',
        (blocks) => ({ type: 'multipart-form', rows: (blocks.multipartForm ?? []).map(rowOf) }),
    ],
    ['file', (blocks) => ({ type: 'file', file: fileOf(blocks.file) })],
]);

/** The body of a `.bru` request by its mode; none when it sends nothing (`none`) or an unknown mode. */
export function bodyOfBru(
    mode: string | null | undefined,
    blocks: Blocks | null | undefined,
): BrunoBody | undefined {
    const read = READERS.get(mode ?? '');

    return read === undefined ? undefined : { ...EMPTY, ...read(blocks ?? {}) };
}
