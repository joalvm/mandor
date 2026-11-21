import type { EditorLanguage, PayloadFormat } from '@mandor/ui';

/** The languages a frame can be read as, laid out and coloured as one. */
export const TEXT_VIEWS = ['json', 'xml', 'html'] as const;

/** The ways to read a frame as it came: its text untouched, or its bytes. */
export const BYTE_VIEWS = ['raw', 'hex'] as const;

/** How the reader reads the frame, picked from the menu of the band over it. */
export type FrameView = (typeof BYTE_VIEWS)[number] | (typeof TEXT_VIEWS)[number];

/** Every view but the bytes: the frame is read as text in the editor. */
export type TextFrameView = Exclude<FrameView, 'hex'>;

/** What a frame opens on: its own language, its text when it has none, its bytes when not text. */
const DEFAULT_VIEW_OF_FORMAT: Readonly<Record<PayloadFormat, FrameView>> = {
    binary: 'hex',
    html: 'html',
    json: 'json',
    text: 'raw',
    xml: 'xml',
};

export function defaultViewOf(format: PayloadFormat): FrameView {
    return DEFAULT_VIEW_OF_FORMAT[format];
}

const LANGUAGE_OF_VIEW: Readonly<Record<TextFrameView, EditorLanguage>> = {
    html: 'html',
    json: 'jsonc',
    raw: 'plaintext',
    xml: 'xml',
};

/** The language the editor colours a view in; the text as it came is coloured in none. */
export function languageOfView(view: TextFrameView): EditorLanguage {
    return LANGUAGE_OF_VIEW[view];
}
