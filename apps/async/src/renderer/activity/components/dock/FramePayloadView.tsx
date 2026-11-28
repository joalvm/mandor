import { useLanguage, useMessages } from '@mandor/i18n';
import { FORMAT_BYTES } from '@mandor/ipc';
import { CodeEditor, HEX_DUMP_BYTES, HexView, type EditorOptions } from '@mandor/ui';
import { useMemo, type ReactNode } from 'react';

import { formatByteSize } from '../../lib/format-byte-size.js';
import { frameByteLength, frameHead, type Frame } from '../../lib/frame-payload.js';
import { frameText } from '../../lib/frame-text.js';
import { languageOfView, type FrameView, type TextFrameView } from '../../lib/frame-views.js';

/**
 * A viewer, not an editor: the frame is the evidence of what arrived, so nobody types here. It
 * reads like the composer reads — numbered, collapsible, colored — minus the caret.
 */
const OPTIONS: EditorOptions = { lineNumbers: 'on', readOnly: true, wordWrap: 'on' };

type FramePayloadViewProps = {
    entryId: string;
    frame: Frame;
    /** How the reader reads the frame: the view it opened on, or the one they picked. */
    view: FrameView;
};

/**
 * The payload of the chosen frame, read in the view the band names: laid out as JSON, coloured
 * as XML or HTML, untouched, or dumped by columns. The document is kept under the entry and the
 * view, so opening another line swaps the document and keeps the one editor. A frame past the
 * cut a response body has is shown as it came and says so: laying out a hundred megabytes froze
 * the window for seconds and nearly tripled what the editor holds.
 */
export function FramePayloadView({ entryId, frame, view }: FramePayloadViewProps): ReactNode {
    return (
        <div
            className="flex h-full min-h-0 min-w-0 flex-1 flex-col"
            data-part="frame-payload-view"
            data-view={view}
        >
            <FramePayloadBody
                frame={frame}
                modelKey={`frame-payload-${entryId}-${view}`}
                view={view}
            />
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
    frame: Frame;
    modelKey: string;
    view: FrameView;
};

function FramePayloadBody({ frame, modelKey, view }: FramePayloadBodyProps) {
    // The bytes are read as a dump; every other view opens the frame in the editor as text.
    if (view === 'hex') {
        return <FrameDump frame={frame} modelKey={modelKey} />;
    }

    return <FrameText frame={frame} modelKey={modelKey} view={view} />;
}

type FrameTextProps = {
    frame: Frame;
    modelKey: string;
    view: TextFrameView;
};

/** The frame read as text, laid out once per frame and view: the dock draws again with every frame. */
function FrameText({ frame, modelKey, view }: FrameTextProps) {
    const messages = useMessages('connections');
    const text = useMemo(
        () => frameText({ binary: frame.binary, data: frame.data }, view),
        [frame.binary, frame.data, view],
    );

    return (
        <>
            <FrameTextNote frame={frame} />
            <CodeEditor
                labels={{
                    editor: messages('payload'),
                }}
                language={languageOfView(view)}
                modelKey={modelKey}
                options={OPTIONS}
                value={text}
            />
        </>
    );
}

/** Bytes read as text are only their head; a text past the cut is only not laid out. */
function FrameTextNote({ frame }: { frame: Frame }) {
    if (frame.binary === true) {
        return <DumpHeadNote frame={frame} limit={FORMAT_BYTES} />;
    }

    return <TooBigNote laidOut={frame.data.length <= FORMAT_BYTES} />;
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
            <DumpHeadNote frame={frame} limit={HEX_DUMP_BYTES} />
            <FrameDumpView bytes={bytes} modelKey={modelKey} />
        </>
    );
}

/** What was left out of a frame read only up to a limit: it says how large it was whole. */
function DumpHeadNote({ frame, limit }: { frame: Frame; limit: number }) {
    const messages = useMessages('connections');
    const language = useLanguage();
    const total = useMemo(() => frameByteLength(frame), [frame]);

    if (total <= limit) {
        return null;
    }

    return (
        <p
            className="flex h-row shrink-0 items-center truncate px-pad-panel text-text-secondary"
            data-part="frame-dump-head"
        >
            {messages('dumpHead', {
                shown: formatByteSize(limit, language),
                total: formatByteSize(total, language),
            })}
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
