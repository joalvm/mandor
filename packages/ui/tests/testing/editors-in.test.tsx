import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CodeEditor } from '../../src/components/editor/CodeEditor.js';
import { editorAt, strayEditors } from '../../src/testing/editors-in.js';

const LABELS = { editor: 'Payload' };

describe('what a test leaves of the editor', () => {
    /** The setup asks after every test; whatever outlives one renders into the next. */
    it('finds the editor and the document still mounted, and nothing once the window is gone', async () => {
        const { unmount } = render(
            <CodeEditor labels={LABELS} language="jsonc" modelKey="payload" value="{}" />,
        );

        await editorAt(0);

        expect(await strayEditors()).toEqual({ editors: 1, models: 1 });

        unmount();

        expect(await strayEditors()).toEqual({ editors: 0, models: 0 });
    });
});
