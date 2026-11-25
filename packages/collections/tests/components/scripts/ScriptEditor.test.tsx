import { createPlainI18n } from '@mandor/i18n';
import {
    ASSERTION_API,
    EMPTY_SCRIPT_CONTEXT,
    RESPONSE_ASSERTION_API,
    SCRIPT_API,
} from '@mandor/script';
import { editorAt } from '@mandor/ui/testing/editors-in';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ScriptEditor } from '../../../src/components/scripts/ScriptEditor.js';
import { AppProviders } from '../../support/app-providers.js';

function shown(props: Partial<Parameters<typeof ScriptEditor>[0]> = {}) {
    return render(
        <AppProviders>
            <ScriptEditor
                context={EMPTY_SCRIPT_CONTEXT}
                event="onBeforeRequest"
                modelKey="script"
                value="console.log(1);"
                {...props}
            />
        </AppProviders>,
    );
}

describe('the editor of a script', () => {
    /** The language of scripts is JavaScript read by a service of its own, against its moment. */
    it('writes a script under its name, long lines folded, hidden characters marked', async () => {
        shown();

        const editor = await editorAt(0);

        expect(screen.getByRole('group', { name: 'Script' })).toBeInTheDocument();
        expect(editor.language()).toBe('script');
        expect(editor.wraps()).toBe(true);
        expect(editor.marksHidden()).toBe(true);
        expect(editor.readOnly()).toBe(false);
    });

    it('tells what was typed, and takes nothing while it is only read', async () => {
        const onChange = vi.fn();
        const { unmount } = shown({ onChange });

        (await editorAt(0)).typeOver('mandor.variables.set("a", 1);');

        expect(onChange).toHaveBeenLastCalledWith('mandor.variables.set("a", 1);');

        unmount();
        shown({ onChange, readOnly: true });

        const read = await editorAt(0);

        read.typeOver('changed');

        expect(read.readOnly()).toBe(true);
        expect(read.marksHidden()).toBe(true);
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    /** A script brought from another app names an API that does not run here: it says so. */
    it('marks what a script names of Postman in the words of the window', async () => {
        shown({ value: 'pm.environment.get("a");\nbru.runRequest("b");\n' });

        const editor = await editorAt(0);

        await expect
            .poll(() => editor.marks())
            .toEqual(
                expect.arrayContaining([
                    'This is from Postman: Convert to mandor.',
                    'This is from Bruno and has no counterpart in mandor.',
                ]),
            );
    });

    /** The help of a name is said in the language of the window, whichever it is. */
    it('has the help of every name of the API, its parameters and its words in Spanish and in English', () => {
        const keys = [...SCRIPT_API, ...ASSERTION_API, ...RESPONSE_ASSERTION_API].flatMap(
            ({ docKey, parameters }) => [
                docKey,
                ...parameters.map((parameter) => parameter.docKey),
            ],
        );
        const missing = (['es', 'en'] as const).flatMap((language) => {
            const texts = createPlainI18n(language);

            return [...new Set(keys)]
                .filter(
                    (docKey) =>
                        typeof texts.getResource(language, 'collections', docKey) !== 'string',
                )
                .map((docKey) => `${language} ${docKey}`);
        });

        expect(missing).toEqual([]);
    });
});
