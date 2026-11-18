import type { languages } from 'monaco-editor/editor/editor.api.js';

/**
 * JSON as a payload is written: comments allowed, and a `{{template}}` standing where a value
 * goes. This grammar belongs to the payload alone — the schema editor speaks the standard `json`
 * language service — because a `{{template}}` is language of the product, not of the format: the
 * standard service would read it as two objects left open and mark a healthy payload broken.
 * What is not JSON at all is marked, so a stray word is red before the linter has had its pause.
 * Its tokens read as JSON to the theme: the themes Monaco ships colour keys, values and literals
 * of JSON apart, and only under the suffix of that language. A template takes a token no theme
 * colours: it reads in the colour of the text, and the editor tells it apart by its slant.
 */
export const JSONC_MONARCH: languages.IMonarchLanguage = {
    defaultToken: 'invalid',
    tokenPostfix: '.json',
    tokenizer: {
        root: [
            { include: '@whitespace' },
            [/\{\{[^}]*\}\}/, 'template'],
            [/[{}]/, 'delimiter.bracket'],
            [/[[\]]/, 'delimiter.array'],
            [/:/, 'delimiter.colon'],
            [/,/, 'delimiter.comma'],
            [/"(?:[^"\\]|\\.)*"(?=\s*:)/, 'string.key'],
            [/"(?:[^"\\]|\\.)*"?/, 'string.value'],
            [/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, 'number'],
            [/(?:true|false|null)\b/, 'keyword'],
        ],
        whitespace: [
            [/\s+/, 'white'],
            [/\/\/.*$/, 'comment'],
            [/\/\*/, 'comment', '@comment'],
        ],
        comment: [
            [/[^/*]+/, 'comment'],
            [/\*\//, 'comment', '@pop'],
            [/[/*]/, 'comment'],
        ],
    },
};

/** What typing leans on: which pairs close themselves and what a comment is made of. */
export const JSONC_CONFIGURATION: languages.LanguageConfiguration = {
    autoClosingPairs: [
        { close: '}', notIn: ['string'], open: '{' },
        { close: ']', notIn: ['string'], open: '[' },
        { close: '"', notIn: ['string'], open: '"' },
    ],
    brackets: [
        ['{', '}'],
        ['[', ']'],
    ],
    comments: { blockComment: ['/*', '*/'], lineComment: '//' },
};
