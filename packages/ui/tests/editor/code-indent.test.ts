import { describe, expect, it } from 'vitest';

import { CODE_INDENT } from '../../src/editor/code-indent.js';
import { formattedJsonc } from '../../src/editor/jsonc-format.js';
import { constructionOptions } from '../../src/editor/monaco/construction-options.js';

describe('the measure code steps in by', () => {
    it('is four columns', () => {
        expect(CODE_INDENT).toBe(4);
    });

    /**
     * The editor and whatever lays a payload out have to agree: text typed in and text
     * formatted by a button end up in the same document, and two measures there read as one
     * broken indent.
     */
    it('is the unit the editor indents with and the one a payload is laid out with', () => {
        const options = constructionOptions({
            ariaLabel: 'Payload',
            language: 'jsonc',
            options: {},
        });

        expect(options.tabSize).toBe(4);
        expect(options.insertSpaces).toBe(true);
        expect(formattedJsonc('{"a":1}')).toBe('{\n    "a": 1\n}');
    });
});
