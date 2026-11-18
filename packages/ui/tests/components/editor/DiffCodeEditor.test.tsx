import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DiffCodeEditor } from '../../../src/components/editor/DiffCodeEditor.js';
import { diffEditorAt } from '../../../src/testing/diff-editors-in.js';

const LABELS = { editor: 'Body', modified: 'Mine', original: 'Incoming' };

describe('the diff of two texts of the app (DiffCodeEditor)', () => {
    it('is a group under the name it was given, in the language it was given', async () => {
        render(<DiffCodeEditor labels={LABELS} language="jsonc" modified="{}" original="[]" />);

        expect(screen.getByRole('group', { name: 'Body' })).toHaveAttribute(
            'data-part',
            'diff-code-editor',
        );
        expect((await diffEditorAt(0)).language()).toBe('jsonc');
    });

    it('shows the incoming text on the left and the result on the right', async () => {
        render(<DiffCodeEditor labels={LABELS} language="plaintext" modified="a" original="b" />);

        const shown = await diffEditorAt(0);

        expect(shown.original()).toBe('b');
        expect(shown.modified()).toBe('a');
    });

    it('marks the lines that differ', async () => {
        render(
            <DiffCodeEditor
                labels={LABELS}
                language="plaintext"
                modified={'one\ntwo\n'}
                original={'one\n2\n'}
            />,
        );

        const shown = await diffEditorAt(0);

        await waitFor(() => {
            expect(shown.changes()).toBe(1);
        });
    });

    it('tells whoever holds it what is typed on the right, and the result is that text', async () => {
        const onModifiedChange = vi.fn();

        render(
            <DiffCodeEditor
                labels={LABELS}
                language="plaintext"
                modified="a"
                onModifiedChange={onModifiedChange}
                original="b"
            />,
        );
        (await diffEditorAt(0)).typeOver('result');

        expect(onModifiedChange).toHaveBeenLastCalledWith('result');
    });

    it('tells nobody anything while it is only read', async () => {
        const onModifiedChange = vi.fn();

        render(
            <DiffCodeEditor
                labels={LABELS}
                language="plaintext"
                modified="a"
                onModifiedChange={onModifiedChange}
                original="b"
                readOnly
            />,
        );

        const shown = await diffEditorAt(0);

        shown.typeOver('result');

        expect(shown.readOnly()).toBe(true);
        expect(onModifiedChange).not.toHaveBeenCalled();
        expect(shown.modified()).toBe('a');
    });
});
