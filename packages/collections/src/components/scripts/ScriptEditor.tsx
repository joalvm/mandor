import { useMessages, useTranslator } from '@mandor/i18n';
import { scriptTypesOf, type ScriptContext, type ScriptEvent } from '@mandor/script';
import { CodeEditor } from '@mandor/ui';
import { useMemo } from 'react';

import { scriptGhostTextOf, scriptSuggestionsOf } from '../../lib/script-completions.js';
import { conversionsOf, foreignMarksOf } from '../../lib/script-translation.js';

type ScriptEditorProps = {
    /** What the place knows: its variables, the headers of its request, a sample of what it reads. */
    context: ScriptContext;
    /** What runs it: the names the script finds in scope depend on it. */
    event: ScriptEvent;
    modelKey: string;
    readOnly?: boolean | undefined;
    value: string;
    onChange?: ((source: string) => void) | undefined;
};

/**
 * The editor of a script: JavaScript, read against the names of the API its event shows, with
 * their text in the language of the window: completed, explained and marked as it is written.
 * What the place knows completes too: the names of its variables and headers, the fields of its
 * sample, the snippets of the moment, and greyed, the field a variable of the environment saves.
 * Long lines fold and what hides or passes for another letter is marked, comments and strings
 * included: a script reads one way and runs another only where nobody can see it. What it names
 * of Postman, Insomnia or Bruno is marked in the words of the window, and the bulb writes it in
 * `mandor.`: the lines of the caret, or the whole script. Nothing converts on its own.
 */
export function ScriptEditor(props: ScriptEditorProps) {
    const { context, event, modelKey, onChange, readOnly, value } = props;
    const labels = useMessages('collections');
    const translate = useTranslator();
    /** The editor compares these by identity: a new object each render would rebuild its providers. */
    const options = useMemo(() => {
        function describe(key: string): string {
            return translate(`collections:${key}`);
        }

        return {
            readOnly,
            check: foreignMarksOf(translate),
            declarations: scriptTypesOf(event, describe, context),
            fixes: conversionsOf(translate),
            ghostText: scriptGhostTextOf(event, context),
            suggest: scriptSuggestionsOf(event, context, describe),
            unicodeHighlight: true,
            wordWrap: 'on' as const,
        };
    }, [context, event, readOnly, translate]);

    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col" data-part="script-editor">
            <CodeEditor
                labels={{ editor: labels('script.editor') }}
                language="script"
                modelKey={modelKey}
                onValueChange={onChange}
                options={options}
                value={value}
            />
        </div>
    );
}
