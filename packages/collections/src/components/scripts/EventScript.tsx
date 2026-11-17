import type { ScriptEntry } from '@mandor/schema';

import { useScriptApproval, type ScriptPlace } from '../../hooks/useScriptApproval.js';
import { ScriptEditor } from './ScriptEditor.js';
import { ScriptTrustBand } from './ScriptTrustBand.js';

type EventScriptProps = {
    entry: ScriptEntry | undefined;
    /** Who owns the text: two views of one place share its document. */
    modelKey: string;
    /** Where the script sits and what runs it, which is what an approval is kept by. */
    place: ScriptPlace;
    /** The script with the text typed; the switch stays as the person set it. */
    onChange: (entry: ScriptEntry) => void;
};

/**
 * The script of one moment, as text: the editor, and above it the band of a text that would not
 * run as it is, which stays readable and editable. Typing the text tells main what is on screen,
 * so the band follows the keys and not the disk.
 */
export function EventScript({ entry, modelKey, place, onChange }: EventScriptProps) {
    const source = entry?.source ?? '';
    const trust = useScriptApproval(place, modelKey, source);

    return (
        <div className="flex h-full min-h-0 flex-col gap-gap-control" data-part="event-script">
            <ScriptTrustBand onApprove={trust.approve} source={source} status={trust.status} />
            <ScriptEditor
                event={place.event}
                modelKey={modelKey}
                onChange={(next) => {
                    if (next === source) {
                        return;
                    }

                    trust.typed(next);
                    onChange({ ...entry, source: next });
                }}
                value={source}
            />
        </div>
    );
}
