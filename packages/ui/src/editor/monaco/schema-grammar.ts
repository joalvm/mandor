import type { languages } from 'monaco-editor/editor/editor.api.js';

/**
 * The words of the standard JSON language, as a schema is written: brackets that pair, the
 * comments a document speaks (a schema of the app is written as JSONC), pairs that close
 * themselves, and the grammar of strings, values and numbers. Nothing here is of this app —
 * it is the language, said the way the editor asks for it.
 */

/** The grammar the editor colours a schema with. */
export const SCHEMA_MONARCH: languages.IMonarchLanguage = {
    tokenizer: {
        root: [
            { include: '@whitespace' },
            [/"(?:[^"\\]|\\.)*"(?=\s*:)/, 'string.key'],
            [/"(?:[^"\\]|\\.)*"?/, 'string'],
            [/\b(?:true|false|null)\b/, 'keyword'],
            [/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, 'number'],
            [/[{}]/, 'delimiter.bracket'],
            [/[[\]]/, 'delimiter.array'],
            [/:/, 'delimiter.colon'],
            [/,/, 'delimiter.comma'],
        ],
        whitespace: [
            [/\s+/, 'white'],
            [/\/\/.*$/, 'comment'],
            [/\/\*/, 'comment', '@comment'],
        ],
        comment: [
            [/\*\//, 'comment', '@pop'],
            [/[^/*]+/, 'comment'],
            [/[/*]/, 'comment'],
        ],
    },
};

/** The pairs, brackets and comments of the language. */
export const SCHEMA_CONFIGURATION: languages.LanguageConfiguration = {
    autoClosingPairs: [
        { close: '"', open: '"' },
        { close: ']', open: '[' },
        { close: '}', open: '{' },
    ],
    brackets: [
        ['[', ']'],
        ['{', '}'],
    ],
    comments: {
        blockComment: ['/*', '*/'],
        lineComment: '//',
    },
    surroundingPairs: [
        { close: '"', open: '"' },
        { close: ']', open: '[' },
        { close: '}', open: '{' },
    ],
};
