import type { EditorLanguage } from '@mandor/ui';

import type { BodyKind } from './body-views.js';

/** The languages a body can be read as, laid out and coloured as one. */
export const TEXT_FORMATS = ['json', 'xml', 'html', 'javascript', 'markdown'] as const;

/** The ways to read a body as it came: the text untouched, its bytes, or their base64. */
export const BYTE_FORMATS = ['raw', 'hex', 'base64'] as const;

/** How the reader reads the body, picked from the menu of the band over it. */
export type BodyFormat = (typeof BYTE_FORMATS)[number] | (typeof TEXT_FORMATS)[number];

/** What a body opens on: its own language, its text when it has none, its bytes when not text. */
const DEFAULT_FORMAT_OF_KIND: Readonly<Record<BodyKind, BodyFormat>> = {
    binary: 'hex',
    html: 'html',
    image: 'hex',
    javascript: 'javascript',
    json: 'json',
    markdown: 'markdown',
    text: 'raw',
    xml: 'xml',
};

export function defaultFormatOf(kind: BodyKind): BodyFormat {
    return DEFAULT_FORMAT_OF_KIND[kind];
}

/**
 * Whether a body can be shown as a browser would draw it: an image, a page, and a JSON document
 * as a table to walk. A table needs all of the document parsed, so past the size the viewer lays
 * out there is none.
 */
const PREVIEW_OF_KIND: Readonly<Record<BodyKind, (laidOut: boolean) => boolean>> = {
    binary: () => false,
    html: () => true,
    image: () => true,
    javascript: () => false,
    json: (laidOut) => laidOut,
    markdown: () => false,
    text: () => false,
    xml: () => false,
};

export function previewableOf(kind: BodyKind, laidOut: boolean): boolean {
    return PREVIEW_OF_KIND[kind](laidOut);
}

/** An image opens drawn: its bytes are what nobody wants to read first. */
export function previewsFirst(kind: BodyKind): boolean {
    return kind === 'image';
}

const LANGUAGE_OF_FORMAT: Readonly<Record<BodyFormat, EditorLanguage>> = {
    base64: 'plaintext',
    hex: 'plaintext',
    html: 'html',
    javascript: 'javascript',
    json: 'jsonc',
    markdown: 'markdown',
    raw: 'plaintext',
    xml: 'xml',
};

/** The language the editor colours a format in; past the size it lays out, it colours nothing. */
export function languageOfBodyFormat(format: BodyFormat, laidOut: boolean): EditorLanguage {
    return laidOut ? LANGUAGE_OF_FORMAT[format] : 'plaintext';
}
