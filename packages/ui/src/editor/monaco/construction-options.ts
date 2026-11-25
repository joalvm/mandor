import type { editor } from 'monaco-editor/editor/editor.api.js';

import { zoomedTextSize } from '../../lib/text-zoom.js';
import { tokenValues } from '../../styles/token-values.js';
import { CODE_FONT_SIZE } from '../code-font-size.js';
import { codePreferences } from '../code-preferences.js';
import type { EditorLanguage } from '../editor-language.js';
import { isReadOnly, type EditorOptions } from '../editor-options.js';

/** An editor is built and later changed with the same options, its own and the shared ones. */
type CodeOptions = editor.IEditorOptions & editor.IGlobalEditorOptions;

/** What one editor is built from: its accessible name, its language and what its caller asked. */
export type EditorSetup = { ariaLabel: string; language: EditorLanguage; options: EditorOptions };

/** The mono type of the product, the one every editor writes in. */
const CODE_FAMILY = tokenValues.scales['mandor-font-mono'];

/**
 * How far apart lines sit, as a share of the size of the text: 18 pixels at the size every editor
 * opens at. It is a proportion and not a measure, so a reader who enlarges the type of a long
 * document enlarges the air between its lines with it.
 */
const CODE_LEADING = 1.5;

/** The type every editor opens in, spelled the way the window asks its fonts for one. */
export const CODE_TYPE = `${String(CODE_FONT_SIZE)}px ${CODE_FAMILY}`;

/**
 * What every editor of the app changes of the editor Monaco ships. Everything it draws is
 * Monaco's own but the minimap. The type, the indent and what it closes are the person's
 * (`codeWriting`). The rest is how it sits in the window: it fills a box the user
 * resizes, a text that fits the box does not scroll, what floats over it is not cut by the panel
 * that holds it, and a wheel that reaches the end of the text scrolls the panel under it.
 *
 * Typing goes through a text area the browser edits, not through an edit context: the Edit menu
 * of the window runs the browser's own commands, and over an edit context the browser keeps no
 * history of the text, so its undo would be off, or would take back the last field it did edit.
 */
const SHARED: CodeOptions = {
    automaticLayout: true,
    detectIndentation: false,
    editContext: false,
    fixedOverflowWidgets: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    // Four pixels, as every box of the window that scrolls draws its bar (`base.css`).
    scrollbar: {
        alwaysConsumeMouseWheel: false,
        horizontalScrollbarSize: 4,
        verticalScrollbarSize: 4,
    },
    unicodeHighlight: {
        ambiguousCharacters: false,
        invisibleCharacters: false,
        nonBasicASCII: false,
    },
    wordBasedSuggestions: 'off',
};

/**
 * What an editor that looks for tricks marks, comments and strings included: left to itself the
 * editor skips them in a trusted workspace, and every workspace of the window is trusted. A
 * letter outside ASCII is no trick by itself; one that passes for another is.
 */
const TRICKS: editor.IUnicodeHighlightOptions = {
    ambiguousCharacters: true,
    includeComments: true,
    includeStrings: true,
    invisibleCharacters: true,
    nonBasicASCII: false,
};

/** How large the text is: the size the person set, at the step the reader put the window's text. */
export function codeSize(): CodeOptions {
    const fontSize = zoomedTextSize(codePreferences().fontSize);

    return { fontSize, lineHeight: Math.round(fontSize * CODE_LEADING) };
}

/**
 * How every editor writes, as the person set it: in the type they named, falling back to the mono
 * type of the product for a family the system lacks, or in the product's alone. It indents by the
 * measure a payload is laid out with, whatever the text it opens was indented by: text typed in
 * and text formatted by a button end up in one document.
 */
export function codeWriting(): CodeOptions {
    const { autoClose, fontFamily, indentSize, indentWithTabs } = codePreferences();
    const named = fontFamily.trim();
    const closing = autoClose ? 'languageDefined' : 'never';

    return {
        autoClosingBrackets: closing,
        autoClosingQuotes: closing,
        fontFamily: named === '' ? CODE_FAMILY : `${named}, ${CODE_FAMILY}`,
        insertSpaces: !indentWithTabs,
        tabSize: indentSize,
    };
}

/** The languages a service of their own completes. */
const SERVED: ReadonlySet<EditorLanguage> = new Set(['json', 'script']);

/** A document that cannot change takes no keys, not even from the text area under it. */
function access(readOnly: boolean): CodeOptions {
    return { domReadOnly: readOnly, readOnly };
}

/**
 * Whether a list of suggestions opens by itself while somebody types. The editor has no source
 * of words, so it opens one only where there is a source: the languages of the schema and of
 * scripts bring their services, and any other language has what its caller suggests.
 */
function suggesting(setup: EditorSetup): CodeOptions {
    const suggests = SERVED.has(setup.language) || setup.options.suggest !== undefined;

    return { quickSuggestions: suggests, suggestOnTriggerCharacters: suggests };
}

/**
 * The options one editor is built with, and changed with when its caller or the settings ask
 * otherwise. An editor its caller lets wrap wraps while the person lets lines wrap; a wrapped dump
 * breaks its columns, so bytes never wrap.
 */
export function constructionOptions(setup: EditorSetup): CodeOptions {
    const wraps =
        setup.language !== 'binary' &&
        setup.options.wordWrap === 'on' &&
        codePreferences().wordWrap;

    return {
        ...SHARED,
        ...codeWriting(),
        ...codeSize(),
        ...access(isReadOnly(setup.language, setup.options)),
        ...suggesting(setup),
        ariaLabel: setup.ariaLabel,
        lineNumbers: setup.options.lineNumbers ?? 'on',
        ...(setup.options.unicodeHighlight === true ? { unicodeHighlight: TRICKS } : {}),
        wordWrap: wraps ? 'on' : 'off',
    };
}
