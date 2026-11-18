import { act, render } from '@testing-library/react';
import { createRef, type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CodeEditor, type CodeEditorHandle } from '../../../src/components/editor/CodeEditor.js';
import { editorAt } from '../../../src/testing/editors-in.js';

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

/** What the split of a doc needs of an editor: where its view is, and when it moved. */
describe('the view of the code editor', () => {
    /** Two views of one text are kept level by whoever holds them, and this is how. */
    it('puts a line at the top for whoever holds it, and says where the view opens', async () => {
        const handle = createRef<CodeEditorHandle>();

        render(editorOf({ language: 'plaintext', ref: handle, value: 'a\nb\nc\nd\ne\nf\ng\nh' }));
        await editorAt(0);

        expect(handle.current?.topLine()).toBe(1);

        act(() => {
            handle.current?.showLine(4);
        });

        expect(handle.current?.topLine()).toBe(4);
    });

    it('says nothing but the first line while there is no editor to ask', () => {
        const handle = createRef<CodeEditorHandle>();

        render(editorOf({ ref: handle }));

        expect(handle.current?.topLine()).toBe(1);
        expect(() => handle.current?.showLine(3)).not.toThrow();
    });

    it('tells whoever holds it that its view moved', async () => {
        const handle = createRef<CodeEditorHandle>();
        const onScroll = vi.fn();

        render(
            editorOf({
                language: 'plaintext',
                onScroll,
                ref: handle,
                value: 'a\nb\nc\nd\ne\nf\ng\nh',
            }),
        );
        await editorAt(0);
        onScroll.mockClear();

        act(() => {
            handle.current?.showLine(4);
        });

        expect(onScroll).toHaveBeenCalled();
    });
});
