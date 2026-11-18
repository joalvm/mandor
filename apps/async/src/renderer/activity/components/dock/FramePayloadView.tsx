import { useMessages } from '@mandor/i18n';
import { FORMAT_BYTES } from '@mandor/ipc';
import {
    CodeEditor,
    HEX_DUMP_BYTES,
    HexView,
    languageOfFormat,
    type EditorOptions,
    type PayloadFormat,
} from '@mandor/ui';
import { useMemo, type ReactNode } from 'react';

import { formatByteSize } from '../../lib/format-byte-size.js';
import { formattedPayload } from '../../lib/formatted-payload.js';
import { frameByteLength, frameHead, type Frame } from '../../lib/frame-payload.js';

/**
 * A viewer, not an editor: the frame is the evidence of what arrived, so nobody types here. It
 * reads like the composer reads — numbered, collapsible, colored — minus the caret.
 */
const OPTIONS: EditorOptions = { lineNumbers: 'on', readOnly: true, wordWrap: 'on' };

type FramePayloadViewProps = {
    entryId: string;
    /** What the frame turned out to be, read once by whoever holds the frame. */
    format: PayloadFormat;
    frame: Frame;
};

/**
 * The payload of the chosen frame, read in the editor: colored, laid out when it parses as JSON,
 * dumped by columns when it carries bytes no text frame carries. The document is kept under the
 * entry, so opening another line swaps the document and keeps the one editor. A frame past the
 * cut a response body has is shown as it came and says so: laying out a hundred megabytes froze
 * the window for seconds and nearly tripled what the editor holds.
 */
export function FramePayloadView({ entryId, format, frame }: FramePayloadViewProps): ReactNode {
    const modelKey = `frame-payload-${entryId}`;
    const laidOut = frame.data.length <= FORMAT_BYTES;
    const text = useMemo(
        () => (laidOut ? formattedPayload(frame.data, format) : frame.data),
        [format, frame.data, laidOut],
    );

    return (
        <div
            className="flex h-full min-h-0 min-w-0 flex-1 flex-col"
            data-format={format}
            data-part="frame-payload-view"
        >
            <TooBigNote laidOut={laidOut || format === 'binary'} />
            <FramePayloadBody format={format} frame={frame} modelKey={modelKey} text={text} />
        </div>
    );
}

function TooBigNote({ laidOut }: { laidOut: boolean }) {
    const messages = useMessages('connections');

    if (laidOut) {
        return null;
    }

    return (
        <p
            className="flex h-row shrink-0 items-center truncate px-pad-panel text-text-secondary"
            data-part="frame-payload-too-big"
        >
            {messages('payloadTooBig')}
        </p>
    );
}

type FramePayloadBodyProps = {
    format: PayloadFormat;
    frame: Frame;
    modelKey: string;
    text: string;
};

function FramePayloadBody({ format, frame, modelKey, text }: FramePayloadBodyProps) {
    const messages = useMessages('connections');

    // Bytes are read as a dump; anything that decodes as text opens in the editor.
    if (format === 'binary') {
        return <FrameDump frame={frame} modelKey={modelKey} />;
    }

    return (
        <CodeEditor
            labels={{
                editor: messages('payload'),
            }}
            language={languageOfFormat(format)}
            modelKey={modelKey}
            options={OPTIONS}
            value={text}
        />
    );
}

/**
 * The dump of a frame, up to its first megabyte. Its bytes are decoded once per frame: the dock
 * draws again with every frame that crosses, and new bytes on each draw made the dump again.
 */
function FrameDump({ frame, modelKey }: { frame: Frame; modelKey: string }) {
    const bytes = useMemo(
        () => frameHead({ binary: frame.binary, data: frame.data }, HEX_DUMP_BYTES),
        [frame.binary, frame.data],
    );

    return (
        <>
            <DumpHeadNote frame={frame} shown={bytes.length} />
            <FrameDumpView bytes={bytes} modelKey={modelKey} />
        </>
    );
}

/** What the dump left out: a frame past the first megabyte says how large it was whole. */
function DumpHeadNote({ frame, shown }: { frame: Frame; shown: number }) {
    const messages = useMessages('connections');
    const total = useMemo(() => frameByteLength(frame), [frame]);

    if (total <= shown) {
        return null;
    }

    return (
        <p
            className="flex h-row shrink-0 items-center truncate px-pad-panel text-text-secondary"
            data-part="frame-dump-head"
        >
            {messages('dumpHead', { shown: formatByteSize(shown), total: formatByteSize(total) })}
        </p>
    );
}

function FrameDumpView({ bytes, modelKey }: { bytes: Uint8Array; modelKey: string }) {
    const messages = useMessages('connections');

    return (
        <HexView
            bytes={bytes}
            labels={{
                bytesPerRow: messages('hexBytesPerRow'),
                copy: messages('editorCopy'),
                editor: messages('payload'),
                hideText: messages('hexHideText'),
                showText: messages('hexShowText'),
            }}
            modelKey={modelKey}
        />
    );
}
