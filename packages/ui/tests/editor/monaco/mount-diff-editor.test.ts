import { waitFor } from '@testing-library/react';
import { editor } from 'monaco-editor/editor/editor.api.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mainThreadDiff } from '../../../src/editor/monaco/main-thread-diff.js';

import {
    diffOptionsOf,
    mountDiffEditor,
    type DiffTarget,
    type MountedDiffEditor,
} from '../../../src/editor/monaco/mount-diff-editor.js';

const TARGET: DiffTarget = {
    language: 'plaintext',
    modified: 'one\ntwo\nthree\n',
    modifiedLabel: 'Mine',
    original: 'one\n2\nthree\n',
    originalLabel: 'Incoming',
    readOnly: false,
};

const mounted: MountedDiffEditor[] = [];

function mount(target: DiffTarget = TARGET, onChange = vi.fn()) {
    const host = document.body.appendChild(document.createElement('div'));
    const diff = mountDiffEditor(host, target, onChange);
    const shown = editor.getDiffEditors().find((each) => host.contains(each.getContainerDomNode()));

    if (shown === undefined) {
        throw new Error('nothing mounted');
    }

    mounted.push(diff);

    return { diff, shown };
}

afterEach(() => {
    mounted.splice(0).forEach((diff) => {
        diff.dispose();
    });
    document.body.replaceChildren();
});

describe('mounting a diff of two texts (mount-diff-editor)', () => {
    it('shows the incoming text on the left and the result on the right, each under its name', () => {
        const { shown } = mount();

        expect(shown.getOriginalEditor().getValue()).toBe(TARGET.original);
        expect(shown.getModifiedEditor().getValue()).toBe(TARGET.modified);
        expect(shown.getOriginalEditor().getOption(editor.EditorOption.ariaLabel)).toBe('Incoming');
        expect(shown.getModifiedEditor().getOption(editor.EditorOption.ariaLabel)).toBe('Mine');
    });

    it('lets only the right pane be written', () => {
        const { shown } = mount();

        expect(shown.getOriginalEditor().getOption(editor.EditorOption.readOnly)).toBe(true);
        expect(shown.getModifiedEditor().getOption(editor.EditorOption.readOnly)).toBe(false);
    });

    it('reads both panes when the whole diff is only read', () => {
        const { shown } = mount({ ...TARGET, readOnly: true });

        expect(shown.getModifiedEditor().getOption(editor.EditorOption.readOnly)).toBe(true);
    });

    it('wraps long lines in both panes only when asked, and follows a change of mind', () => {
        const { diff, shown } = mount();
        const wrapped = (): string[] =>
            [shown.getOriginalEditor(), shown.getModifiedEditor()].map((pane) =>
                pane.getOption(editor.EditorOption.wordWrap),
            );

        expect(wrapped()).toEqual(['off', 'off']);

        diff.update({ ...TARGET, wrap: true });

        expect(wrapped()).toEqual(['on', 'on']);
    });

    it('draws the numbers of the lines, or leaves them out when asked, in both panes', () => {
        const { diff, shown } = mount();
        const numbers = (): string[] =>
            [shown.getOriginalEditor(), shown.getModifiedEditor()].map((pane) =>
                pane.getOption(editor.EditorOption.lineNumbers).renderType.toString(),
            );

        expect(numbers()).toEqual(['1', '1']);

        diff.update({ ...TARGET, lineNumbers: 'off' });

        expect(numbers()).toEqual(['0', '0']);
    });

    it('keeps the panes one above the other only when asked', () => {
        expect(diffOptionsOf(TARGET).renderSideBySide).toBeUndefined();
        expect(diffOptionsOf({ ...TARGET, inline: true }).renderSideBySide).toBe(false);
    });

    /**
     * The comparison runs on the thread that draws the window. Two texts of a few thousand lines
     * that share none took the five seconds the editor allows by default, all of them frozen.
     */
    it('gives up on a comparison before the window is felt to freeze', () => {
        expect(diffOptionsOf(TARGET).maxComputationTime).toBeLessThanOrEqual(500);
    });

    it('offers no code actions in a pane, so the bulb of the margin never shows', () => {
        const { shown } = mount();

        expect(shown.getModifiedEditor().getOption(editor.EditorOption.lightbulb).enabled).toBe(
            'off',
        );
    });

    it('hands out every change of the right pane', () => {
        const onChange = vi.fn();
        const { diff, shown } = mount(TARGET, onChange);

        shown.getModifiedEditor().trigger('test', 'type', { text: 'x' });

        expect(onChange).toHaveBeenCalledOnce();
        expect(onChange).toHaveBeenLastCalledWith(diff.getModified());
    });

    it('follows the texts and the access its caller changes', () => {
        const { diff, shown } = mount();

        diff.update({ ...TARGET, modified: 'a\n', original: 'b\n', readOnly: true });

        expect(shown.getOriginalEditor().getValue()).toBe('b\n');
        expect(diff.getModified()).toBe('a\n');
        expect(shown.getModifiedEditor().getOption(editor.EditorOption.readOnly)).toBe(true);
    });

    it('keeps no undo of the texts of a pane that is only read', () => {
        const { diff, shown } = mount();

        diff.update({ ...TARGET, modified: 'a\n', original: 'b\n' });

        expect(shown.getOriginalEditor().getModel()?.canUndo()).toBe(false);
        expect(shown.getModifiedEditor().getModel()?.canUndo()).toBe(true);
    });

    it('takes the language of its caller on both panes', () => {
        const { diff, shown } = mount();

        diff.update({ ...TARGET, language: 'jsonc' });

        expect(shown.getOriginalEditor().getModel()?.getLanguageId()).toBe('jsonc');
        expect(shown.getModifiedEditor().getModel()?.getLanguageId()).toBe('jsonc');
    });

    it('leaves no document and no editor behind once it is disposed', () => {
        const before = editor.getModels().length;
        const { diff } = mount();

        diff.dispose();
        mounted.splice(0);

        expect(editor.getModels()).toHaveLength(before);
        expect(editor.getDiffEditors()).toHaveLength(0);
    });
});

/** The window has no worker on purpose: the lines that differ are worked out right here. */
describe('the comparison made without a worker (main-thread-diff)', () => {
    it('finds the block of lines that differs', async () => {
        const { shown } = mount();

        await waitFor(() => {
            expect(shown.getLineChanges()).toHaveLength(1);
        });
        expect(shown.getLineChanges()?.[0]).toMatchObject({
            modifiedStartLineNumber: 2,
            originalStartLineNumber: 2,
        });
    });

    it('finds nothing in two equal texts', async () => {
        const { shown } = mount({ ...TARGET, original: TARGET.modified });

        await waitFor(() => {
            expect(shown.getLineChanges()).toEqual([]);
        });
    });

    it('finds nothing to compare once a document is gone', async () => {
        const model = editor.createModel('a');
        const other = editor.createModel('b');

        other.dispose();

        await expect(
            mainThreadDiff.computeDiff(model, other, {
                ignoreTrimWhitespace: false,
                maxComputationTimeMs: 0,
            }),
        ).resolves.toMatchObject({ changes: [], identical: true });
        model.dispose();
    });
});
