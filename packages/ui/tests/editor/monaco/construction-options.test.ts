import { afterEach, describe, expect, it } from 'vitest';

import type { EditorOptions } from '../../../src/editor/editor-options.js';
import { constructionOptions } from '../../../src/editor/monaco/construction-options.js';
import { setTextZoom } from '../../../src/lib/text-zoom.js';

function optionsFor(options: EditorOptions, language: 'binary' | 'jsonc' = 'jsonc') {
    return constructionOptions({ ariaLabel: 'Payload', language, options });
}

afterEach(() => {
    setTextZoom(0);
});

describe('what an editor is built with', () => {
    it('names the editor for whoever reads the screen', () => {
        expect(optionsFor({}).ariaLabel).toBe('Payload');
    });

    it('numbers the lines unless told not to', () => {
        expect(optionsFor({}).lineNumbers).toBe('on');
        expect(optionsFor({ lineNumbers: 'off' }).lineNumbers).toBe('off');
    });

    it('wraps long lines only when asked to', () => {
        expect(optionsFor({}).wordWrap).toBe('off');
        expect(optionsFor({ wordWrap: 'on' }).wordWrap).toBe('on');
    });

    it('refuses input when read-only', () => {
        expect(optionsFor({ readOnly: true })).toMatchObject({ domReadOnly: true, readOnly: true });
        expect(optionsFor({})).toMatchObject({ domReadOnly: false, readOnly: false });
    });

    /** A wrapped dump breaks its columns, and the bytes of a received frame are what arrived. */
    it('shows bytes read-only and unwrapped, whatever it was asked', () => {
        expect(optionsFor({ readOnly: false, wordWrap: 'on' }, 'binary')).toMatchObject({
            readOnly: true,
            wordWrap: 'off',
        });
    });

    /**
     * The Edit menu of the window runs the browser's own commands, and the browser only offers
     * them for an input it edits itself: over an edit context it keeps no history of the text,
     * and its undo would take back the last field it did edit instead.
     */
    it('takes its typing through an input the browser edits, so the Edit menu reaches it', () => {
        expect(optionsFor({}).editContext).toBe(false);
    });

    /** The type of the product is the one a payload reads in everywhere else in the window. */
    it('writes in the mono type of the product, twelve pixels on lines of eighteen', () => {
        expect(optionsFor({})).toMatchObject({ fontSize: 12, lineHeight: 18 });
        expect(optionsFor({}).fontFamily).toContain('IBM Plex Mono');
    });

    /** A reader who enlarges a long document enlarges the air between its lines with it. */
    it('writes at the step the reader put the text of the window at, the lines as far apart', () => {
        setTextZoom(5);

        expect(optionsFor({})).toMatchObject({ fontSize: 18, lineHeight: 27 });
    });

    /** The editor looks the way Monaco ships it: its menu, colours and margins. */
    it('draws what Monaco draws, the minimap aside', () => {
        const options = optionsFor({});

        expect(options.minimap).toEqual({ enabled: false });
        [
            'bracketPairColorization',
            'contextmenu',
            'glyphMargin',
            'padding',
            'renderLineHighlight',
        ].forEach((name) => {
            expect(options).not.toHaveProperty(name);
        });
    });

    /** Scrolling past the last line would give a three-line payload a scrollbar of its own. */
    it('scrolls only once the text outgrows its box', () => {
        expect(optionsFor({}).scrollBeyondLastLine).toBe(false);
    });

    /**
     * Words are never suggested out of the document, and a language with no source of its own
     * suggests only what its caller hands it: a popup over every word typed in a payload would
     * be a menu with nothing in it.
     */
    it('suggests while typing only where somebody gives suggestions', () => {
        const suggest = () => [];

        expect(optionsFor({})).toMatchObject({
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
        });
        expect(optionsFor({ suggest })).toMatchObject({
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
        });
    });

    it('lets the language of the schema suggest as it always did: its service is the source', () => {
        expect(constructionOptions({ ariaLabel: '', language: 'json', options: {} })).toMatchObject(
            { quickSuggestions: true, suggestOnTriggerCharacters: true },
        );
    });

    /** A script is read by a service of its own, which knows the names its event shows. */
    it('lets a script suggest with no suggestions handed: the service of scripts is the source', () => {
        expect(
            constructionOptions({ ariaLabel: '', language: 'script', options: {} }),
        ).toMatchObject({ quickSuggestions: true, suggestOnTriggerCharacters: true });
    });
});
