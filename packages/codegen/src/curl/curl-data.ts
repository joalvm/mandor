import { scanTemplate, type TemplateSegment } from '@mandor/vars';

import type { DataPart } from './curl-body-part.js';

/** A piece of the body: text to send, or the path of a file curl would read. */
export type DataPiece =
    { kind: 'text'; text: string; json: boolean } | { kind: 'file'; path: string; json: boolean };

/** A literal stretch, encoded; a placeholder as it was written, or it would stop being one. */
function encodedSegment(segment: TemplateSegment): string {
    if (segment.kind === 'variable') {
        return `{{${segment.name}}}`;
    }

    return encodeURIComponent(segment.text);
}

function encodeTemplate(text: string): string {
    return scanTemplate(text).map(encodedSegment).join('');
}

function named(name: string, content: string): string {
    return name === '' ? content : `${name}=${content}`;
}

/**
 * `--data-urlencode` takes `content`, `=content`, `name=content`, `@file` or `name@file`; the
 * equals sign wins, as in curl. The name is not encoded: curl expects it encoded already.
 */
function urlencodePiece(value: string): DataPiece {
    const equals = value.indexOf('=');
    const at = value.indexOf('@');

    if (equals >= 0) {
        const content = encodeTemplate(value.slice(equals + 1));

        return { kind: 'text', text: named(value.slice(0, equals), content), json: false };
    }

    if (at >= 0) {
        return { kind: 'file', path: value.slice(at + 1), json: false };
    }

    return { kind: 'text', text: encodeTemplate(value), json: false };
}

/** A value that names a file after `@`, or else the text to send. */
function fileOrText(value: string, json: boolean): DataPiece {
    if (value.startsWith('@')) {
        return { kind: 'file', path: value.slice(1), json };
    }

    return { kind: 'text', text: value, json };
}

/** How each data option reads its value. `--data-raw` has no `@`; `--json` sends JSON. */
const PIECE_OF_KIND: Readonly<Record<DataPart['kind'], (value: string) => DataPiece>> = {
    data: (value) => fileOrText(value, false),
    binary: (value) => fileOrText(value, false),
    json: (value) => fileOrText(value, true),
    raw: (value) => ({ kind: 'text', text: value, json: false }),
    urlencode: urlencodePiece,
};

/** What one data option sends. */
export function dataPieceOf(part: DataPart): DataPiece {
    return PIECE_OF_KIND[part.kind](part.value);
}
