import { useLanguage, useMessages } from '@mandor/i18n';
import { HEX_DUMP_BYTES, HexView } from '@mandor/ui';

import { BodyPreview } from './BodyPreview.js';
import { BodyText } from './BodyText.js';
import type { BodyContent } from './lib/body-content.js';
import type { BodyFormat } from './lib/body-formats.js';
import { formatBytes } from './lib/format-response.js';

type ResponseBodyViewProps = {
    content: BodyContent;
    format: BodyFormat;
    /** The document of the editor: one body keeps its view, and a new one starts over. */
    modelKey: string;
    /** Called when the reader nears the end of what is in; the owner reads the next window. */
    onNearEnd: () => void;
    preview: boolean;
    /** The size of the whole body, of which `content` may hold only the windows read so far. */
    total: number;
    wrap: boolean;
};

/**
 * One body the way the reader asked for it: drawn as a browser would, its bytes in the dump, or
 * its text in the format chosen.
 */
export function ResponseBodyView({
    content,
    format,
    modelKey,
    onNearEnd,
    preview,
    total,
    wrap,
}: ResponseBodyViewProps) {
    if (preview) {
        return <BodyPreview content={content} />;
    }

    if (format === 'hex') {
        return <BodyDump bytes={content.bytes} modelKey={`${modelKey}-hex`} total={total} />;
    }

    return (
        <BodyText
            content={content}
            modelKey={`${modelKey}-${format}`}
            onNearEnd={onNearEnd}
            wrap={wrap}
        />
    );
}

type BodyDumpProps = { bytes: Uint8Array; modelKey: string; total: number };

/** The bytes in the dump, and how much of a body larger than the dump it shows. */
function BodyDump({ bytes, modelKey, total }: BodyDumpProps) {
    const labels = useMessages('requests');

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-col" data-part="response-body-dump">
            <DumpHeadNote shown={bytes.length} total={total} />
            <HexView
                bytes={bytes}
                labels={{
                    bytesPerRow: labels('hexBytesPerRow'),
                    copy: labels('editorCopy'),
                    editor: labels('body'),
                    hideText: labels('hexHideText'),
                    showText: labels('hexShowText'),
                }}
                modelKey={modelKey}
            />
        </div>
    );
}

/** Said only once more was read than the dump shows: the band already tells what is read. */
function DumpHeadNote({ shown, total }: { shown: number; total: number }) {
    const labels = useMessages('requests');
    const language = useLanguage();

    if (shown <= HEX_DUMP_BYTES) {
        return null;
    }

    return (
        <p
            className="flex h-row shrink-0 items-center truncate px-pad-panel text-text-secondary"
            data-part="response-body-dump-head"
        >
            {labels('dumpHead', {
                shown: formatBytes(HEX_DUMP_BYTES, language),
                total: formatBytes(total, language),
            })}
        </p>
    );
}
