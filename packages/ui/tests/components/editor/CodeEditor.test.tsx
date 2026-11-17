import { act, render, screen } from '@testing-library/react';
import { createRef, type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CodeEditor, type CodeEditorHandle } from '../../../src/components/editor/CodeEditor.js';
import { editorAt, editorsIn } from '../../../src/testing/editors-in.js';

const LABELS = { editor: 'Payload' };

function editorOf(props: Partial<ComponentProps<typeof CodeEditor>> = {}) {
    return (
        <CodeEditor
            labels={LABELS}
            language="jsonc"
            modelKey="payload"
            value={'{"a": 1}'}
            {...props}
        />
    );
}

/** The editor mounts through useCodeEditor, once useEditorRuntime has loaded it. */
describe('the code editor of the app', () => {
    it('shows its text in its language, under the name it was given', async () => {
        render(editorOf());

        expect(screen.getByRole('group', { name: 'Payload' })).toBeInTheDocument();

        const shown = await editorAt(0);

        expect(shown.text()).toBe('{"a": 1}');
        expect(shown.language()).toBe('jsonc');
    });

    it('tells whoever holds it what was typed', async () => {
        const onValueChange = vi.fn();

        render(editorOf({ onValueChange }));
        (await editorAt(0)).typeOver('{"b": 2}');

        expect(onValueChange).toHaveBeenLastCalledWith('{"b": 2}');
    });

    it('tells whoever holds it the text was emptied', async () => {
        const onValueChange = vi.fn();

        render(editorOf({ onValueChange }));
        (await editorAt(0)).typeOver('');

        expect(onValueChange).toHaveBeenLastCalledWith('');
    });

    /** A holder that drew again holds what it drew last: the text goes there, never to an old one. */
    it('tells what was typed to the holder it was drawn with last', async () => {
        const mounted = vi.fn();
        const last = vi.fn();
        const { rerender } = render(editorOf({ onValueChange: mounted }));
        const shown = await editorAt(0);

        rerender(editorOf({ onValueChange: last }));
        shown.typeOver('{"b": 2}');

        expect(mounted).not.toHaveBeenCalled();
        expect(last).toHaveBeenLastCalledWith('{"b": 2}');
    });

    /** The file can change with nobody typing here: a revert writes it back from the history. */
    it('follows a text that changes outside it', async () => {
        const { rerender } = render(editorOf());
        const shown = await editorAt(0);

        rerender(editorOf({ value: '[]' }));

        expect(shown.text()).toBe('[]');
    });

    it('shows one document in every view of it', async () => {
        render(
            <>
                {editorOf({ modelKey: 'shared', value: 'uno' })}
                {editorOf({ modelKey: 'shared', value: 'uno' })}
            </>,
        );

        (await editorAt(1)).typeOver('dos');

        expect((await editorAt(0)).text()).toBe('dos');
    });

    it('marks what is wrong with a text that can be written, and nothing in one that is only read', async () => {
        const { rerender } = render(editorOf({ value: '{"a": }' }));
        const shown = await editorAt(0);

        expect(shown.marks()).toEqual(['Value expected']);

        rerender(editorOf({ options: { readOnly: true }, value: '{"a": }' }));

        expect(shown.marks()).toEqual([]);
        expect(shown.readOnly()).toBe(true);
    });

    /** A dump is what arrived, laid out by whoever dumped it, and never written here. */
    it('reads a dump of bytes without letting anyone write it', async () => {
        const onValueChange = vi.fn();
        const dump = '00000000: 00 01 68 6F 6C 61  ..hola';

        render(editorOf({ language: 'binary', onValueChange, value: dump }));

        const shown = await editorAt(0);

        expect(shown.text()).toBe(dump);

        shown.typeOver('x');

        expect(shown.readOnly()).toBe(true);
        expect(shown.text()).toBe(dump);
        expect(onValueChange).not.toHaveBeenCalled();
    });

    it('lays its text out for whoever holds it', async () => {
        const handle = createRef<CodeEditorHandle>();

        render(
            <CodeEditor
                labels={LABELS}
                language="jsonc"
                modelKey="payload"
                ref={handle}
                value={'{"a":1}'}
            />,
        );

        const shown = await editorAt(0);

        await act(async () => {
            await expect(handle.current?.run('format')).resolves.toBe(true);
        });

        expect(shown.text()).toBe('{\n    "a": 1\n}');
    });

    it('selects the value a JSON Pointer names, for whoever holds it', async () => {
        const handle = createRef<CodeEditorHandle>();

        render(
            <CodeEditor
                labels={LABELS}
                language="jsonc"
                modelKey="payload"
                ref={handle}
                value={'{"a": {"b": [1, "two"]}}'}
            />,
        );

        const shown = await editorAt(0);

        act(() => {
            handle.current?.selectPointer('/a/b/1');
        });

        expect(shown.selected()).toBe('"two"');

        act(() => {
            handle.current?.selectPointer('/nowhere');
        });

        expect(shown.selected()).toBe('"two"');
    });

    it('lets its editor go when it leaves', async () => {
        const { unmount } = render(editorOf());

        await editorAt(0);
        unmount();

        await expect(editorsIn()).resolves.toEqual([]);
    });
});
