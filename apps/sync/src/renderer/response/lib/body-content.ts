import { type EditorLanguage, formattedJsonc } from '@mandor/ui';

import { base64OfBytes, textOfBytes } from './body-bytes.js';
import { languageOfBodyFormat, type BodyFormat } from './body-formats.js';
import type { BodyKind } from './body-views.js';

/** What a view of a body draws: the bytes, or the text or the image address made of them. */
export type BodyContent = {
    bytes: Uint8Array;
    /** The image as an address the page can show, once all of it is here. */
    dataUrl: string | null;
    kind: BodyKind;
    language: EditorLanguage;
    text: string;
};

type BodyContentInput = {
    bytes: Uint8Array;
    /** Whether every byte of the body has been read. */
    complete: boolean;
    format: BodyFormat;
    kind: BodyKind;
    /** Whether the body is small enough to lay out and colour. */
    laidOut: boolean;
    /** Whether the body is drawn as a browser would, rather than read in a format. */
    preview: boolean;
    type: string;
};

/**
 * The text each format reads. Only JSON changes when it is laid out, and only its whitespace
 * moves; XML and HTML are shown as they came, because re-indenting them would show something the
 * server did not send. The dump reads the bytes and needs no text.
 */
const TEXT_OF_FORMAT: Readonly<
    Record<BodyFormat, (bytes: Uint8Array, laidOut: boolean) => string>
> = {
    base64: (bytes) => base64OfBytes(bytes),
    hex: () => '',
    html: (bytes) => textOfBytes(bytes),
    javascript: (bytes) => textOfBytes(bytes),
    json: (bytes, laidOut) => {
        const text = textOfBytes(bytes);

        return laidOut ? (formattedJsonc(text) ?? text) : text;
    },
    markdown: (bytes) => textOfBytes(bytes),
    raw: (bytes) => textOfBytes(bytes),
    xml: (bytes) => textOfBytes(bytes),
};

/**
 * What the view draws. A preview of an image is its address, once every byte is in; a preview of
 * anything else is its text as it came, for the frame or the table to read, also once every byte
 * is in: drawn at every window, a page was read whole and loaded again once per window. Until then
 * the text is empty, which a body with bytes never is. A format is its text in its language.
 */
export function bodyContentOf(input: BodyContentInput): BodyContent {
    const { bytes, complete, format, kind, laidOut, preview, type } = input;
    const content: BodyContent = { bytes, dataUrl: null, kind, language: 'plaintext', text: '' };

    if (preview && kind === 'image') {
        return {
            ...content,
            dataUrl: complete ? `data:${type};base64,${base64OfBytes(bytes)}` : null,
        };
    }

    if (preview) {
        return { ...content, text: complete ? textOfBytes(bytes) : '' };
    }

    return {
        ...content,
        language: languageOfBodyFormat(format, laidOut),
        text: TEXT_OF_FORMAT[format](bytes, laidOut),
    };
}
