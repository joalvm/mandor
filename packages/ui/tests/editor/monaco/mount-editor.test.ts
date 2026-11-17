import { editor } from 'monaco-editor/editor/editor.api.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EditorOptions } from '../../../src/editor/editor-options.js';
import {
    mountEditor,
    stepFocusedEditor,
    type EditorTarget,
    type MountedEditor,
} from '../../../src/editor/monaco/mount-editor.js';

const JSONC: EditorTarget = {
    ariaLabel: 'Payload',
    language: 'jsonc',
    modelKey: 'k',
    options: {},
    value: '{"a": 1}',
};

const mountedEditors: MountedEditor[] = [];

type Mounted = { mounted: MountedEditor; shown: editor.ICodeEditor };

function mount(target: EditorTarget, onChange = vi.fn()): Mounted {
    const host = document.body.appendChild(document.createElement('div'));
    const mounted = mountEditor(host, target, onChange);
    const shown = editor.getEditors().find((each) => host.contains(each.getContainerDomNode()));

    if (shown === undefined) {
        throw new Error('nothing mounted');
    }

    mountedEditors.push(mounted);

    return { mounted, shown };
}

function marksOf(shown: editor.ICodeEditor): editor.IMarker[] {
    const model = shown.getModel();

    return model === null ? [] : editor.getModelMarkers({ resource: model.uri });
}

afterEach(() => {
    mountedEditors.splice(0).forEach((mounted) => {
        mounted.dispose();
    });
    document.body.replaceChildren();
});

describe('mounting an editor', () => {
    it('shows the text of its document, in its language, under its name', () => {
        const { shown } = mount(JSONC);

        expect(shown.getValue()).toBe('{"a": 1}');
        expect(shown.getModel()?.getLanguageId()).toBe('jsonc');
        expect(shown.getOption(editor.EditorOption.ariaLabel)).toBe('Payload');
    });

    /**
     * Whoever opens an editor to write in it should not have to click into it first. Left alone
     * it takes nothing: see the step of history that no editor holds the focus for.
     */
    it('takes the caret when it is built, if its caller asks', () => {
        const { shown } = mount({ ...JSONC, options: { focusOnMount: true } });

        expect(shown.hasTextFocus()).toBe(true);
    });

    it('hands out every change of the text', () => {
        const onChange = vi.fn();
        const { shown } = mount({ ...JSONC, language: 'plaintext', value: 'a' }, onChange);

        shown.trigger('keyboard', 'type', { text: 'b' });

        expect(onChange).toHaveBeenLastCalledWith('ba');
    });

    /** Two views of one text are one document: what is typed in one is read in the other. */
    it('shares one document between the editors of one key', () => {
        const { shown: first } = mount({ ...JSONC, language: 'plaintext', value: 'a' });
        const { shown: second } = mount({ ...JSONC, language: 'plaintext', value: 'a' });

        first.trigger('keyboard', 'type', { text: 'b' });

        expect(second.getValue()).toBe('ba');
    });

    it('writes the text it is given as one step of undo', async () => {
        const { mounted, shown } = mount(JSONC);

        mounted.setValue('{"a": 2}');

        expect(mounted.getValue()).toBe('{"a": 2}');

        await shown.getModel()?.undo();

        expect(shown.getValue()).toBe('{"a": 1}');
    });

    it('keeps no undo of the texts an editor only read is given', () => {
        const { mounted, shown } = mount({ ...JSONC, options: { readOnly: true } });

        mounted.setValue('{"a": 2}');
        mounted.setValue('{"a": 3}');

        expect(mounted.getValue()).toBe('{"a": 3}');
        expect(shown.getModel()?.canUndo()).toBe(false);
    });

    it('runs its commands over its own text', async () => {
        const { mounted, shown } = mount(JSONC);

        await expect(mounted.run('format')).resolves.toBe(true);
        expect(shown.getValue()).toBe('{\n    "a": 1\n}');
    });

    it('selects a stretch of its text and takes the caret there', () => {
        const { mounted, shown } = mount({ ...JSONC, value: '{\n  "a": 1,\n  "b": true\n}' });
        const selection = (): string => {
            const range = shown.getSelection();

            return range === null ? '' : (shown.getModel()?.getValueInRange(range) ?? '');
        };

        mounted.select({ from: 19, to: 23 });

        expect(selection()).toBe('true');
        expect(shown.hasTextFocus()).toBe(true);
    });
});

describe('an editor whose setup changes', () => {
    it('moves to the document of a new key and lets the old one go', () => {
        const { mounted, shown } = mount(JSONC);
        const old = shown.getModel()?.uri.toString();

        mounted.update({ ...JSONC, modelKey: 'other', value: '[]' });

        expect(shown.getValue()).toBe('[]');
        expect(editor.getModels().map((model) => model.uri.toString())).not.toContain(old);
    });

    it('reads the same text in a new language', () => {
        const { mounted, shown } = mount(JSONC);

        mounted.update({ ...JSONC, language: 'xml' });

        expect(shown.getModel()?.getLanguageId()).toBe('xml');
        expect(shown.getValue()).toBe('{"a": 1}');
    });

    it('marks what is wrong only while the text can be written', () => {
        const broken = { ...JSONC, value: '{"a": }' };
        const { mounted, shown } = mount(broken);

        expect(marksOf(shown)[0]?.message).toBe('Value expected');

        mounted.update({ ...broken, options: { readOnly: true } });

        expect(marksOf(shown)).toEqual([]);
        expect(shown.getOption(editor.EditorOption.readOnly)).toBe(true);
    });

    it('marks what the caller says is wrong in a language that checks nothing of its own', () => {
        const check = (text: string) => [
            { from: 0, message: 'caller says so', severity: 'error' as const, to: text.length },
        ];
        const plain: EditorTarget = { ...JSONC, language: 'plaintext', value: 'abc' };
        const { mounted, shown } = mount({ ...plain, options: { check } });

        expect(marksOf(shown)[0]?.message).toBe('caller says so');

        mounted.update(plain);

        expect(marksOf(shown)).toEqual([]);
    });

    /** A caller that writes its options inline hands a new object on every render. */
    it('checks nothing again for options that say what they said', () => {
        const schemaLint = { schema: vi.fn(() => '{}') };
        const { mounted } = mount({ ...JSONC, options: { schemaLint, wordWrap: 'on' } });

        schemaLint.schema.mockClear();
        mounted.update({ ...JSONC, options: { schemaLint, wordWrap: 'on' } });

        expect(schemaLint.schema).not.toHaveBeenCalled();
    });

    it('paints the variables its options resolve', () => {
        const options: EditorOptions = {
            variables: { variablesOf: () => [{ from: 6, name: 'x', to: 7, tone: 'resolved' }] },
        };
        const { mounted, shown } = mount(JSONC);

        mounted.update({ ...JSONC, options });

        const classes = shown
            .getModel()
            ?.getAllDecorations()
            .map((each) => each.options.inlineClassName);

        expect(classes).toContain('mandor-variable mandor-variable-resolved');
    });

    /**
     * The Edit menu of the window asks for a step of the history, and the history of the
     * document is the editor's: the field the caret sits in holds none of it.
     */
    it('takes a step of the history over the editor that holds the focus', () => {
        const { mounted, shown } = mount(JSONC);

        shown.focus();
        mounted.setValue('{"a": 2}');

        expect(stepFocusedEditor('undo')).toBe(true);
        expect(mounted.getValue()).toBe('{"a": 1}');
        expect(stepFocusedEditor('redo')).toBe(true);
        expect(mounted.getValue()).toBe('{"a": 2}');
    });

    /** Nothing of the window is the editor's while the caret is somewhere else. */
    it('takes no step while no editor holds the focus', () => {
        mount(JSONC);

        expect(stepFocusedEditor('undo')).toBe(false);
    });

    it('leaves nothing behind when it goes', () => {
        const { mounted, shown } = mount(JSONC);
        const uri = shown.getModel()?.uri.toString();

        mounted.dispose();
        mountedEditors.splice(0);

        expect(editor.getEditors()).toEqual([]);
        expect(editor.getModels().map((model) => model.uri.toString())).not.toContain(uri);
    });
});
