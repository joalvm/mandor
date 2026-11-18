import { describe, expect, it } from 'vitest';

import type { EditorDiagnostic } from '../../src/editor/editor-diagnostic.js';
import { jsoncDiagnostics } from '../../src/editor/jsonc-diagnostics.js';

function error(from: number, to: number, message: string): EditorDiagnostic {
    return { from, message, severity: 'error', to };
}

describe('the syntax marks of a jsonc text', () => {
    it('reads comments as valid', () => {
        expect(jsoncDiagnostics('// note\n{ "a": [1, 2], /* b */ "c": 3 }')).toEqual([]);
    });

    /** JSON refuses it: the mark sits on the comma, even when a comment hides the closer. */
    it('marks each trailing comma over the comma itself', () => {
        expect(jsoncDiagnostics('{ "a": [1,], "b": 2, // c\n}')).toEqual([
            error(9, 10, 'Trailing comma'),
            error(19, 20, 'Trailing comma'),
        ]);
    });

    /** The margin used to say `PropertyNameExpected`: the words are for people. */
    it('names the error in words, over the token that broke it', () => {
        expect(jsoncDiagnostics('{ "a" 1 }')).toEqual([error(6, 7, 'Colon expected')]);
        expect(jsoncDiagnostics('{ "a": }')).toEqual([error(7, 8, 'Value expected')]);
    });

    /** A mark with no width draws no squiggle and no hover: at the end it takes the last character. */
    it('keeps a mark at the end of the text on the last character', () => {
        expect(jsoncDiagnostics('{ "a": 1')).toEqual([error(7, 8, 'Closing brace expected')]);
    });

    it('marks every error the text holds', () => {
        expect(jsoncDiagnostics('{"a": tru}')).toEqual([
            error(6, 9, 'Invalid symbol'),
            error(9, 10, 'Value expected'),
        ]);
    });

    it('reads a template as the value it stands for, bare or quoted', () => {
        expect(jsoncDiagnostics('{ "n": {{count}}, "s": "{{name}}" }')).toEqual([]);
    });

    it('marks nothing while the text is still empty', () => {
        expect(jsoncDiagnostics('')).toEqual([]);
        expect(jsoncDiagnostics('  \n ')).toEqual([]);
    });
});
