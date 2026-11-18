import { useMessages, useTranslator } from '@mandor/i18n';
import type { ScriptEvent } from '@mandor/script';
import { CodeEditor } from '@mandor/ui';
import { useMemo } from 'react';

import { scriptSuggestions } from '../../lib/script-suggestions.js';

type ScriptEditorProps = {
    /** What runs it: the names the script finds in scope depend on it. */
    event: ScriptEvent;
    modelKey: string;
    readOnly?: boolean | undefined;
    value: string;
    onChange?: ((source: string) => void) | undefined;
};

/**
 * The editor of a script: JavaScript, with the names of the API its event shows suggested as it
 * is written. Long lines fold and what hides or passes for another letter is marked, comments
 * and strings included: a script reads one way and runs another only where nobody can see it.
 */
export function ScriptEditor({ event, modelKey, onChange, readOnly, value }: ScriptEditorProps) {
    const labels = useMessages('collections');
    const translate = useTranslator();
    /** The editor compares these by identity: a new object each render would rebuild its providers. */
    const options = useMemo(
        () => ({
            readOnly,
            suggest: scriptSuggestions(event, (docKey) => translate(`collections:${docKey}`)),
            unicodeHighlight: true,
            wordWrap: 'on' as const,
        }),
        [event, readOnly, translate],
    );

    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col" data-part="script-editor">
            <CodeEditor
                labels={{ editor: labels('script.editor') }}
                language="javascript"
                modelKey={modelKey}
                onValueChange={onChange}
                options={options}
                value={value}
            />
        </div>
    );
}
