import { useMessages } from '@mandor/i18n';
import type { ImportedScriptEvent } from '@mandor/schema';
import { CodeEditor, IconButton, useToast, type EditorOptions } from '@mandor/ui';

import {
    convertImportedScript,
    type ConvertedScripts,
    type ScriptsOfPlace,
} from '../../lib/convert-imported-script.js';

type RequestImportedScriptsProps = {
    /** Who owns the text: two views of one place share the document. */
    modelKey: string;
    /** The scripts of the place, its own and the imported: moving one changes both. */
    parts: ScriptsOfPlace;
    /** Both lists as they are after a move, or back as they were before it. */
    onChange: (changes: ConvertedScripts) => void;
};

/** A reader, not an editor: the script is what the document said, kept as it came. */
const OPTIONS: EditorOptions = { lineNumbers: 'on', readOnly: true, wordWrap: 'on' };

/** The heading of each script, by the moment of the send it hooked into. */
const HEADING_OF_EVENT: Readonly<
    Record<ImportedScriptEvent, 'scriptEventBefore' | 'scriptEventResponse'>
> = {
    onBeforeRequest: 'scriptEventBefore',
    onResponse: 'scriptEventResponse',
};

/**
 * The scripts a place came with, shown as the text they are. Mandor runs none of them, and the
 * notice above says so: a script that looks live and does nothing would be a lie. Each one moves
 * into the editor of its moment as it is, waiting for approval there; the toast undoes the move.
 */
export function RequestImportedScripts({ modelKey, parts, onChange }: RequestImportedScriptsProps) {
    const labels = useMessages('requests');
    const { notify } = useToast();
    const scripts = parts.importedScripts ?? [];

    function convert(index: number): void {
        const before: ConvertedScripts = {
            scripts: parts.scripts,
            importedScripts: parts.importedScripts?.slice(),
        };

        onChange(convertImportedScript(parts, index));
        notify({
            action: {
                label: labels('scriptConvertUndo'),
                onSelect: () => {
                    onChange(before);
                },
            },
            title: labels('scriptConverted'),
            tone: 'info',
        });
    }

    return (
        <div
            className="flex h-full min-h-0 flex-col gap-gap-control"
            data-part="request-imported-scripts"
        >
            <p className="shrink-0 text-xs text-text-secondary">
                {labels('importedScriptsNotice')}
            </p>
            {scripts.map((script, index) => (
                <div
                    className="flex min-h-0 flex-1 flex-col gap-gap-control"
                    data-part="request-imported-script"
                    key={script.event}
                >
                    <div className="flex shrink-0 items-center gap-gap-control">
                        <h3 className="text-xs font-medium">
                            {labels(HEADING_OF_EVENT[script.event])}
                        </h3>
                        <IconButton
                            className="ml-auto"
                            icon="edit"
                            label={labels('scriptConvert')}
                            onClick={() => {
                                convert(index);
                            }}
                        />
                    </div>
                    <div className="min-h-0 flex-1" data-part="request-imported-script-source">
                        <CodeEditor
                            labels={{
                                editor: labels('scriptEditor'),
                            }}
                            language="plaintext"
                            modelKey={`${modelKey}:script:${String(index)}`}
                            options={OPTIONS}
                            value={script.source}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
