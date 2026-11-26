import { editor } from 'monaco-editor/editor/editor.api.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    codePreferences,
    DEFAULT_CODE_PREFERENCES,
    setCodePreferences,
    watchCodePreferences,
} from '../../src/editor/code-preferences.js';
import { formattedJsonc } from '../../src/editor/jsonc-format.js';
import { formattedMarkup } from '../../src/editor/markup-format.js';
import { followCodePreferences } from '../../src/editor/monaco/follow-code-preferences.js';
import { mountDiffEditor } from '../../src/editor/monaco/mount-diff-editor.js';
import { mountEditor } from '../../src/editor/monaco/mount-editor.js';

const disposals: (() => void)[] = [];

function host(): HTMLElement {
    return document.body.appendChild(document.createElement('div'));
}

function editorsIn(element: HTMLElement): editor.ICodeEditor[] {
    return editor.getEditors().filter((each) => element.contains(each.getContainerDomNode()));
}

/** An editor its caller lets wrap, as every payload editor of the apps is. */
function mountPayload(element: HTMLElement): editor.ICodeEditor {
    const target = {
        ariaLabel: 'Payload',
        language: 'jsonc',
        modelKey: 'payload',
        options: { wordWrap: 'on' },
    } as const;
    const mounted = mountEditor(element, { ...target, value: '{}' }, vi.fn());

    disposals.push(mounted.dispose);

    const [shown] = editorsIn(element);

    if (shown === undefined) {
        throw new Error('nothing mounted');
    }

    return shown;
}

function writing(shown: editor.ICodeEditor) {
    const model = shown.getModel()?.getOptions();

    return {
        autoClose: shown.getOption(editor.EditorOption.autoClosingBrackets),
        family: shown.getOption(editor.EditorOption.fontFamily),
        insertSpaces: model?.insertSpaces,
        size: shown.getOption(editor.EditorOption.fontSize),
        tabSize: model?.tabSize,
        wrap: shown.getOption(editor.EditorOption.wordWrap),
    };
}

const CHANGED = {
    autoClose: false,
    fontFamily: 'Cascadia Code',
    fontSize: 16,
    indentSize: 2,
    indentWithTabs: true,
    wordWrap: false,
};

afterEach(() => {
    disposals.splice(0).forEach((dispose) => {
        dispose();
    });
    document.body.replaceChildren();
    setCodePreferences(DEFAULT_CODE_PREFERENCES);
});

describe('how every editor writes, as the settings say (code-preferences)', () => {
    it('tells whoever listens of a change, and of nothing that did not change', () => {
        const heard = vi.fn();
        const stop = watchCodePreferences(heard);

        setCodePreferences({ ...DEFAULT_CODE_PREFERENCES });
        setCodePreferences({ ...DEFAULT_CODE_PREFERENCES, fontSize: 14 });
        stop();
        setCodePreferences(DEFAULT_CODE_PREFERENCES);

        expect(heard).toHaveBeenCalledTimes(1);
        expect(codePreferences().fontSize).toBe(12);
    });

    it('rewrites an editor with what it stands on at the change, until it stops following', () => {
        const shown = { updateOptions: vi.fn() };
        const standing = { fontSize: 12 };
        const following = followCodePreferences(shown, () => standing);

        standing.fontSize = 16;
        setCodePreferences({ ...DEFAULT_CODE_PREFERENCES, fontSize: 16 });
        following.dispose();
        setCodePreferences(DEFAULT_CODE_PREFERENCES);

        expect(shown.updateOptions.mock.calls).toEqual([[{ fontSize: 16 }]]);
    });

    it('rewrites an editor already open: type, size, indent, closing and wrapping', () => {
        const shown = mountPayload(host());

        expect(writing(shown)).toMatchObject({ insertSpaces: true, size: 12, tabSize: 4 });
        expect(writing(shown)).toMatchObject({ autoClose: 'languageDefined', wrap: 'on' });

        setCodePreferences(CHANGED);

        expect(writing(shown)).toMatchObject({
            autoClose: 'never',
            insertSpaces: false,
            size: 16,
            tabSize: 2,
            wrap: 'off',
        });
        expect(writing(shown).family).toMatch(/^Cascadia Code, .*IBM Plex Mono/);
    });

    it('rewrites both panes of an open diff', () => {
        const element = host();
        const target = {
            language: 'jsonc',
            modified: '{"a":2}',
            modifiedLabel: 'Mine',
            original: '{"a":1}',
            originalLabel: 'Theirs',
            readOnly: true,
        } as const;

        disposals.push(mountDiffEditor(element, target, vi.fn()).dispose);
        setCodePreferences(CHANGED);

        expect(editorsIn(element)).toHaveLength(2);
        editorsIn(element).forEach((pane) => {
            expect(pane.getOption(editor.EditorOption.fontSize)).toBe(16);
        });
    });

    /** Text typed in and text laid out by a button end up in one document. */
    it('lays out a payload with the indent the editors type with', async () => {
        setCodePreferences({ ...DEFAULT_CODE_PREFERENCES, indentSize: 2 });

        expect(formattedJsonc('{"a":{"b":1}}')).toBe('{\n  "a": {\n    "b": 1\n  }\n}');

        setCodePreferences({ ...DEFAULT_CODE_PREFERENCES, indentWithTabs: true });

        expect(formattedJsonc('{"a":1}')).toBe('{\n\t"a": 1\n}');
        await expect(formattedMarkup('<a><b>1</b></a>', 'xml')).resolves.toBe(
            '<a>\n\t<b>1</b>\n</a>',
        );
    });
});
