import { MessagesProvider } from '@mandor/i18n';
import { editorAt } from '@mandor/ui/testing/editors-in';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DocEditor } from '../src/components/editor/DocEditor.js';

const LABEL = 'Editor de la doc';
const KEY = 'mandor://demo/api/doc/notas.md';

function mount(value: string, onChange = vi.fn()) {
    // The editor speaks the language of the window; the mount answers with one.
    const view = render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <DocEditor label={LABEL} modelKey={KEY} onChange={onChange} value={value} />
        </MessagesProvider>,
    );

    function again(next: string): void {
        view.rerender(
            <MessagesProvider preferences={{ language: 'es' }}>
                <DocEditor label={LABEL} modelKey={KEY} onChange={onChange} value={next} />
            </MessagesProvider>,
        );
    }

    return { again, onChange };
}

describe('editing one doc', () => {
    /** The text of a doc is markdown wherever it is edited, and the editor is told so. */
    it('opens the text of the doc in markdown', async () => {
        mount('# Notas\n');

        const editor = await editorAt(0);

        expect(screen.getByRole('group', { name: LABEL })).toBeVisible();
        expect(editor.text()).toBe('# Notas\n');
        expect(editor.language()).toBe('markdown');
    });

    /**
     * A doc is written as a file, and a file is where the line somebody else's report names —the
     * line a link broke on— has to be findable.
     */
    it('counts the lines of the markdown in its margin', async () => {
        mount('# Notas\n');

        expect((await editorAt(0)).numbered()).toBe(true);
    });

    /** Nothing saves here: what the reader typed leaves at once and someone else writes it. */
    it('hands out every change without waiting to be asked', async () => {
        const { onChange } = mount('Antes');

        (await editorAt(0)).typeOver('Después');

        expect(onChange).toHaveBeenCalledWith('Después');
    });

    /** `Revertir doc` changes the file behind the editor, and the reader has to see it. */
    it('shows a text that changed away from the editor', async () => {
        const { again } = mount('Un desastre.');
        const editor = await editorAt(0);

        editor.typeOver('Un desastre, y más.');
        again('La primera versión.');

        expect(editor.text()).toBe('La primera versión.');
    });

    /** Typing comes back as a new value, and putting it in again would move the cursor. */
    it('leaves the editor alone when the text it gets back is its own', async () => {
        const { again, onChange } = mount('Antes');
        const editor = await editorAt(0);

        editor.typeOver('Antes y después');
        again('Antes y después');

        expect(onChange).toHaveBeenCalledOnce();
    });
});
