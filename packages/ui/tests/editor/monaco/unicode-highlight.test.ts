import { editor } from 'monaco-editor/editor/editor.api.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EditorOptions } from '../../../src/editor/editor-options.js';
import { constructionOptions } from '../../../src/editor/monaco/construction-options.js';
import '../../../src/editor/monaco/monaco-setup.js';

/** A right-to-left override: what comes after it reads backwards, and the code runs as written. */
const BIDI = '\u202E';

/** A space of no width: two names that look alike, and are not. */
const ZERO_WIDTH = '\u200B';

function mounted(value: string, options: EditorOptions): editor.IStandaloneCodeEditor {
    const host = document.body.appendChild(document.createElement('div'));

    return editor.create(host, {
        ...constructionOptions({ ariaLabel: 'Script', language: 'javascript', options }),
        language: 'javascript',
        value,
    });
}

/** Where the editor marks a character somebody might not see, as offsets of the text. */
function marked(shown: editor.IStandaloneCodeEditor): number[] {
    const model = shown.getModel();

    return (model?.getAllDecorations() ?? [])
        .filter(({ options }) => options.className === 'unicode-highlight')
        .map(({ range }) => model?.getOffsetAt(range.getStartPosition()) ?? -1)
        .sort((a, b) => a - b);
}

afterEach(() => {
    editor.getEditors().forEach((shown) => {
        shown.getContainerDomNode().remove();
        shown.dispose();
    });
});

describe('the characters an editor of scripts shows', () => {
    /**
     * A comment that reverses what follows it, or a string with a space nobody sees, is how code
     * reads one way and runs another. By default the editor leaves comments out in a workspace it
     * trusts, and every workspace of the window is trusted. The editor asks a worker for them,
     * and the window has none: `main-thread-unicode` answers instead.
     */
    it('marks a bidi in a comment and a zero-width space in a string', async () => {
        const text = `// admin${BIDI} only\nconst key = 'a${ZERO_WIDTH}b';`;
        const shown = mounted(text, { unicodeHighlight: true });

        await vi.waitFor(() => {
            expect(marked(shown)).toEqual([text.indexOf(BIDI), text.indexOf(ZERO_WIDTH)]);
        });
    });

    /** A body in Cyrillic is a body in Cyrillic: only an editor of scripts looks for a trick. */
    it('marks nothing in an editor that did not ask', () => {
        expect(
            constructionOptions({ ariaLabel: '', language: 'jsonc', options: {} }),
        ).toMatchObject({
            unicodeHighlight: {
                ambiguousCharacters: false,
                invisibleCharacters: false,
                nonBasicASCII: false,
            },
        });
    });

    it('marks what hides or looks like another letter, and not every letter outside ASCII', () => {
        const options = constructionOptions({
            ariaLabel: '',
            language: 'javascript',
            options: { unicodeHighlight: true },
        });

        expect(options.unicodeHighlight).toEqual({
            ambiguousCharacters: true,
            includeComments: true,
            includeStrings: true,
            invisibleCharacters: true,
            nonBasicASCII: false,
        });
    });
});
