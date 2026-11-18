import { useMemo, useState, type ReactNode } from 'react';

import {
    DEFAULT_HEX_ROW_WIDTH,
    HEX_DUMP_BYTES,
    hexDump,
    hexRowWidthOf,
    HEX_ROW_WIDTHS,
    type HexRowWidth,
} from '../../editor/hex-dump.js';
import { IconButton } from '../button/IconButton.js';
import { Select } from '../input/Select.js';
import { CodeEditor } from './CodeEditor.js';

/** What the view says about itself and its actions. The words belong to whoever mounts it. */
type HexViewLabels = {
    bytesPerRow: string;
    copy: string;
    editor: string;
    hideText: string;
    showText: string;
};

type HexViewProps = {
    bytes: Uint8Array;
    labels: HexViewLabels;
    /** The document, not the view: the dump of one frame is kept under its own key. */
    modelKey: string;
};

const WIDTH_OPTIONS = HEX_ROW_WIDTHS.map((width) => ({
    label: String(width),
    value: String(width),
}));

/**
 * A frame that never was text, read as bytes. The band over it belongs to the reader: how many
 * bytes a line carries, whether what they spell is printed beside them, and the whole dump on
 * the clipboard — the menu of the editor copies the selection, which is a line of a protocol
 * nobody reads by hand. What the band decides is the view's, not the frame's: the bytes are what
 * arrived, and nothing here writes them. Only the first megabyte of them is dumped.
 */
export function HexView({ bytes, labels, modelKey }: HexViewProps): ReactNode {
    const [bytesPerRow, setBytesPerRow] = useState<HexRowWidth>(DEFAULT_HEX_ROW_WIDTH);
    const [text, setText] = useState(true);
    const dump = useMemo(
        () => hexDump(bytes.subarray(0, HEX_DUMP_BYTES), { ascii: text, bytesPerRow }),
        [bytes, bytesPerRow, text],
    );

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-col" data-part="hex-view">
            <div
                className="flex h-section shrink-0 items-center justify-end gap-gap-control px-pad-panel"
                data-part="hex-view-band"
            >
                <Select
                    className="w-20"
                    label={labels.bytesPerRow}
                    onValueChange={(value) => {
                        setBytesPerRow(hexRowWidthOf(value));
                    }}
                    options={WIDTH_OPTIONS}
                    value={String(bytesPerRow)}
                />
                <IconButton
                    active={text}
                    icon="split-vertical"
                    label={text ? labels.hideText : labels.showText}
                    onClick={() => {
                        setText(!text);
                    }}
                />
                <IconButton
                    icon="copy"
                    label={labels.copy}
                    onClick={() => {
                        void navigator.clipboard.writeText(dump);
                    }}
                />
            </div>
            <div className="min-h-0 min-w-0 flex-1" data-part="hex-view-dump">
                <CodeEditor
                    labels={{ editor: labels.editor }}
                    language="binary"
                    modelKey={modelKey}
                    options={{ lineNumbers: 'off', readOnly: true }}
                    value={dump}
                />
            </div>
        </div>
    );
}
