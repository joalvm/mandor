import type { PayloadFormat } from '../lib/detected-format.js';

/**
 * What the editor can read: the languages the app shows, and not one it would have to load. The
 * languages of code are the ones a request is copied as; their grammars were already in, for the
 * fenced blocks of a doc.
 */
export type EditorLanguage =
    | 'bat'
    | 'binary'
    | 'csharp'
    | 'go'
    | 'graphql'
    | 'html'
    | 'java'
    | 'javascript'
    | 'json'
    | 'jsonc'
    | 'markdown'
    | 'php'
    | 'plaintext'
    | 'powershell'
    | 'python'
    | 'script'
    | 'shell'
    | 'xml'
    | 'yaml';

/** A received frame has no comments and a payload being written may; one language reads both. */
const LANGUAGE_OF_FORMAT: Readonly<Record<PayloadFormat, EditorLanguage>> = {
    binary: 'binary',
    html: 'html',
    json: 'jsonc',
    text: 'plaintext',
    xml: 'xml',
};

/** The language a payload is shown in, from what the payload turned out to be. */
export function languageOfFormat(format: PayloadFormat): EditorLanguage {
    return LANGUAGE_OF_FORMAT[format];
}
