import type { languages } from 'monaco-editor/editor/editor.api.js';

/**
 * A hex dump in three columns: the offset of the line, the bytes, and what they spell. The gap
 * of two spaces is where the bytes end, since the bytes are one space apart; what follows is the
 * text column, whatever characters it spells.
 */
export const HEXDUMP_MONARCH: languages.IMonarchLanguage = {
    tokenPostfix: '.hexdump',
    tokenizer: {
        root: [
            [/^[0-9A-F]{8}:/, 'comment'],
            [/( {2,})(.*)$/, ['white', 'string']],
            [/[0-9A-F]{2}/, 'number'],
            [/ /, 'white'],
        ],
    },
};
