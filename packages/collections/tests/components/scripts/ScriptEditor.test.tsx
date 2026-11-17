import { createPlainI18n } from '@mandor/i18n';
import { SCRIPT_API } from '@mandor/script';
import { editorAt } from '@mandor/ui/testing/editors-in';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ScriptEditor } from '../../../src/components/scripts/ScriptEditor.js';
import { AppProviders } from '../../support/app-providers.js';

function shown(props: Partial<Parameters<typeof ScriptEditor>[0]> = {}) {
    return render(
        <AppProviders>
            <ScriptEditor
                event="onBeforeRequest"
                modelKey="script"
                value="console.log(1);"
                {...props}
            />
        </AppProviders>,
    );
}

describe('the editor of a script', () => {
    it('writes JavaScript under its name, long lines folded, hidden characters marked', async () => {
        shown();

        const editor = await editorAt(0);

        expect(screen.getByRole('group', { name: 'Script' })).toBeInTheDocument();
        expect(editor.language()).toBe('javascript');
        expect(editor.wraps()).toBe(true);
        expect(editor.marksHidden()).toBe(true);
        expect(editor.readOnly()).toBe(false);
    });

    it('tells what was typed, and takes nothing while it is only read', async () => {
        const onChange = vi.fn();
        const { unmount } = shown({ onChange });

        (await editorAt(0)).typeOver('vars.set("a", 1);');

        expect(onChange).toHaveBeenLastCalledWith('vars.set("a", 1);');

        unmount();
        shown({ onChange, readOnly: true });

        const read = await editorAt(0);

        read.typeOver('changed');

        expect(read.readOnly()).toBe(true);
        expect(read.marksHidden()).toBe(true);
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    /** The help of a name is said in the language of the window, whichever it is. */
    it('has the help of every name of the API in Spanish and in English', () => {
        const missing = (['es', 'en'] as const).flatMap((language) => {
            const texts = createPlainI18n(language);

            return SCRIPT_API.filter(
                ({ docKey }) =>
                    typeof texts.getResource(language, 'collections', docKey) !== 'string',
            ).map(({ docKey }) => `${language} ${docKey}`);
        });

        expect(missing).toEqual([]);
    });
});
