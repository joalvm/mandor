import { frameByteLength, frameHead, type Frame } from './frame-payload.js';

/** What a row of the timeline can show of a frame before the ellipsis takes over. */
const PREVIEW_LIMIT = 200;

/** What a row shows of a frame that was never text: enough bytes to recognize a protocol by. */
const PREVIEW_BYTES = 16;

const HEX = 16;

function hexPreview(frame: Frame): string {
    const head = frameHead(frame, PREVIEW_BYTES);
    const cells = Array.from(head, (byte) =>
        byte.toString(HEX).toUpperCase().padStart(2, '0'),
    ).join(' ');

    return frameByteLength(frame) > head.length ? `${cells}…` : cells;
}

/**
 * The head of a frame, as one line and no longer than a row can hold. A frame is as large as
 * the socket allowed, and the row is a single line: handing the whole payload to the DOM so
 * that `truncate` can hide all but a fraction of it costs the timeline that payload per row.
 * Only the head is read, so a megabyte of data is never walked to draw a hundred characters.
 *
 * A frame that was never text is shown as the bytes it opens with. The base64 it travelled in
 * is not what arrived, and reading a protocol by its first bytes is what a dump is for.
 */
export function messagePreview(frame: Frame): string {
    if (frame.binary === true) {
        return hexPreview(frame);
    }

    const head = frame.data.slice(0, PREVIEW_LIMIT + 1);
    const breakAt = head.indexOf('\n');
    const line = breakAt === -1 ? head : head.slice(0, breakAt);

    return line.length > PREVIEW_LIMIT ? `${line.slice(0, PREVIEW_LIMIT)}…` : line;
}
