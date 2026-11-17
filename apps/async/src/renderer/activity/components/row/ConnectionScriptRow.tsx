import { useMessages } from '@mandor/i18n';
import { CodeIcon, ErrorIcon } from '@mandor/icons';
import { cn } from '@mandor/ui';

import type { ConnectionScriptEntry } from '../../activity-entry.js';
import { formatActivityTime } from '../../lib/format-activity-time.js';
import { scriptNoteFigures } from '../../lib/script-note-words.js';

const GLYPH = 'flex w-6 shrink-0 items-center justify-center';

type ConnectionScriptRowProps = {
    entry: ConnectionScriptEntry;
};

/**
 * What the scripts of the connection said at one moment, as one quiet line among the frames: the
 * moment and its figures. What they wrote is in the console, and the dock says the rest.
 */
export function ConnectionScriptRow({ entry }: ConnectionScriptRowProps) {
    const labels = useMessages('connections');
    const broke = entry.detail.error !== undefined;

    return (
        <div
            className="flex h-row min-w-0 flex-1 items-center gap-gap-group px-pad-control text-xs tabular-nums text-text-secondary"
            data-broke={broke}
            data-part="activity-script-row"
        >
            <ScriptGlyph broke={broke} />
            <BrokeGlyph broke={broke} />
            <span className="min-w-0 flex-1 truncate" data-part="activity-script-message">
                {scriptNoteFigures(entry.detail, labels)}
            </span>
            <time className="w-16 shrink-0" dateTime={new Date(entry.at).toISOString()}>
                {formatActivityTime(entry.at)}
            </time>
            {/* The column of the bytes, empty: the moment stays under the moments of the frames. */}
            <span aria-hidden="true" className="w-13 shrink-0" />
        </div>
    );
}

type GlyphProps = { broke: boolean };

function ScriptGlyph({ broke }: GlyphProps) {
    if (broke) {
        return null;
    }

    return (
        <span aria-hidden="true" className={GLYPH}>
            <CodeIcon size="sm" />
        </span>
    );
}

function BrokeGlyph({ broke }: GlyphProps) {
    if (!broke) {
        return null;
    }

    return (
        <span aria-hidden="true" className={cn(GLYPH, 'text-text-error')}>
            <ErrorIcon size="sm" />
        </span>
    );
}
