import type { languages } from 'monaco-editor/editor/editor.api.js';

/**
 * Markdown, with the TextMate names the GitHub theme reads (`markup.heading`, `markup.list`,
 * `markup.quote`…). The grammar Monaco ships calls a heading, a bullet and a table row all
 * `keyword`, and no theme can tell three things apart under one name.
 *
 * A fenced block goes on in the language its fence names, so the code of a doc is read in its
 * own colours: the block of shell in the middle of a page is the part to read most carefully.
 */
export const MARKDOWN_MONARCH: languages.IMonarchLanguage = {
    defaultToken: '',
    escapes: /\\[\\`*_{}[\]()#+\-.!~|<>]/,
    tokenPostfix: '.md',
    tokenizer: {
        root: [
            [/^ {0,3}#{1,6}(?:\s.*)?$/, 'markup.heading'],
            [/^\s*=+\s*$/, 'markup.heading'],
            [/^ {0,3}(?:(?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})$/, 'meta.separator'],
            [/^\s*>.*$/, 'markup.quote'],
            [
                /^\s*```\s*([\w\-+#./]+).*$/,
                { next: '@fencedIn', nextEmbedded: '$1', token: 'markup.fenced' },
            ],
            [/^\s*```.*$/, { next: '@fenced', token: 'markup.fenced' }],
            [/^\s*~~~.*$/, { next: '@fencedTilde', token: 'markup.fenced' }],
            [/^(\s*)([*+-]|\d+[.)])(\s+)(\[[ xX]\])(?=\s)/, ['', 'markup.list', '', 'markup.list']],
            [/^(\s*)([*+-]|\d+[.)])(\s+)/, ['', 'markup.list', '']],
            [
                /^( {0,3})(\[[^\]]+\])(:\s*)(\S+)/,
                ['', 'constant.other.reference.link', '', 'markup.underline.link'],
            ],
            { include: '@inline' },
        ],
        comment: [
            [/-->/, 'comment', '@pop'],
            [/[^-]+/, 'comment'],
            [/-/, 'comment'],
        ],
        fenced: [
            [/^\s*```\s*$/, { next: '@pop', token: 'markup.fenced' }],
            [/.*$/, 'markup.raw'],
        ],
        fencedIn: [
            [/^\s*```\s*$/, { next: '@pop', nextEmbedded: '@pop', token: 'markup.fenced' }],
            [/[^`]+/, 'markup.raw'],
            [/`/, 'markup.raw'],
        ],
        fencedTilde: [
            [/^\s*~~~\s*$/, { next: '@pop', token: 'markup.fenced' }],
            [/.*$/, 'markup.raw'],
        ],
        inline: [
            [/@escapes/, 'constant.character.escape'],
            [/&(?:\w+|#\d+|#x[\da-fA-F]+);/, 'constant.character.escape'],
            [/(`+)([^`]+?)(\1)/, 'markup.inline.raw'],
            [/\*\*(?:[^\\*]|@escapes|\*(?!\*))+\*\*/, 'markup.bold'],
            [/\b__(?:[^\\_]|@escapes|_(?!_))+__\b/, 'markup.bold'],
            [/\*(?=\S)(?:[^\\*]|@escapes)+?\*/, 'markup.italic'],
            [/\b_[^_\s][^_]*_\b/, 'markup.italic'],
            [/~~[^~]+~~/, 'markup.strikethrough'],
            [/\[\^[^\]]+\]/, 'constant.other.reference.link'],
            [
                /(!?\[)((?:[^\]\\]|@escapes)*)(\]\()([^)\s]*)(\))/,
                ['', 'string.other.link', '', 'markup.underline.link', ''],
            ],
            [
                /(!?\[)((?:[^\]\\]|@escapes)*)(\])(\[[^\]]*\])/,
                ['', 'string.other.link', '', 'constant.other.reference.link'],
            ],
            [/<(?:https?|mailto):[^>\s]+>/, 'markup.underline.link'],
            [/https?:\/\/[^\s<>()]+/, 'markup.underline.link'],
            [/<!--/, 'comment', '@comment'],
            [/<\/?[a-zA-Z][\w-]*(?:\s[^>]*)?\/?>/, 'entity.name.tag'],
            [/[^\\`*_~[\]!<&h\s]+|\s+/, ''],
        ],
    },
};

/** How the editor treats the brackets and comments of markdown: what Monaco ships, unchanged. */
export const MARKDOWN_CONFIGURATION: languages.LanguageConfiguration = {
    autoClosingPairs: [
        { close: '}', open: '{' },
        { close: ']', open: '[' },
        { close: ')', open: '(' },
        { close: '>', notIn: ['string'], open: '<' },
    ],
    brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')'],
    ],
    comments: { blockComment: ['<!--', '-->'] },
    folding: {
        markers: {
            end: /^\s*<!--\s*#?endregion\b.*-->/,
            start: /^\s*<!--\s*#?region\b.*-->/,
        },
    },
    surroundingPairs: [
        { close: ')', open: '(' },
        { close: ']', open: '[' },
        { close: '`', open: '`' },
    ],
};
