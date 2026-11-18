import { afterEach, describe, expect, it } from 'vitest';

import { loadEditorMessages } from '../../src/editor/editor-messages.js';

type NlsGlobals = { _VSCODE_NLS_LANGUAGE?: string; _VSCODE_NLS_MESSAGES?: readonly string[] };

const nls = globalThis as NlsGlobals;

afterEach(() => {
    document.documentElement.removeAttribute('lang');
});

describe('the language the editor is read in', () => {
    /** Monaco carries English written into its own source: loading a bundle for it is weight. */
    it('loads nothing for the language the editor was written in', async () => {
        document.documentElement.lang = 'en';

        await loadEditorMessages();

        expect(nls._VSCODE_NLS_LANGUAGE).toBeUndefined();
    });

    /** The window says which language it is read in, and the editor is read in that one too. */
    it('loads the messages Monaco ships for the language of the window', async () => {
        document.documentElement.lang = 'es';

        await loadEditorMessages();

        expect(nls._VSCODE_NLS_LANGUAGE).toBe('es');
        expect(nls._VSCODE_NLS_MESSAGES?.length).toBeGreaterThan(0);
    });
});
