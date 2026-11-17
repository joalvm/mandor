// isolation-policy: the shape shows only before the editor of the window loads, and this file sees that load.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CodeEditor } from '../../../src/components/editor/CodeEditor.js';
import { editorAt } from '../../../src/testing/editors-in.js';

describe('the shape an editor shows while it loads (EditorSkeleton)', () => {
    /**
     * Monaco measures the code type at the first editor and keeps the reading: built before the
     * type is in, every caret stands off the letters. The place shows the shape of a text until
     * the editor and its type are both in, and then the editor takes it.
     */
    it('holds the place until the editor and its type are in, then gives it to the editor', async () => {
        const fonts = document.fonts;
        let arrive: () => void = () => undefined;
        const arrival = new Promise<FontFace[]>((resolve) => {
            arrive = () => {
                resolve([]);
            };
        });

        Object.assign(document, {
            fonts: { addEventListener: () => undefined, load: () => arrival },
        });

        render(
            <CodeEditor labels={{ editor: 'Payload' }} language="jsonc" modelKey="k" value="{}" />,
        );

        const group = screen.getByRole('group', { name: 'Payload' });

        expect(group.querySelector('[data-part="editor-skeleton"]')).toBeInTheDocument();
        expect(group.querySelector('.monaco-editor')).toBeNull();

        arrive();

        expect((await editorAt(0)).text()).toBe('{}');
        expect(group.querySelector('[data-part="editor-skeleton"]')).toBeNull();

        Object.assign(document, { fonts });
    });
});
