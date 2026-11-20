import { FORMAT_BYTES } from '@mandor/ipc';

import { formattedPayload } from './formatted-payload.js';
import { frameHead, type Frame } from './frame-payload.js';
import type { TextFrameView } from './frame-views.js';

const DECODER = new TextDecoder();

/**
 * The text a frame was written in, or the bytes it arrived as read in UTF-8. Of bytes only the
 * head a text is laid out up to is decoded: a frame is as large as the socket allowed, and the
 * dock says how much of it it left out.
 */
function textOf(frame: Frame): string {
    if (frame.binary !== true) {
        return frame.data;
    }

    return DECODER.decode(frameHead(frame, FORMAT_BYTES));
}

/** Only JSON is laid out, and only up to the cut a response body has; the rest reads as it came. */
const TEXT_OF_VIEW: Readonly<Record<TextFrameView, (text: string) => string>> = {
    html: (text) => text,
    json: (text) => (text.length <= FORMAT_BYTES ? formattedPayload(text, 'json') : text),
    raw: (text) => text,
    xml: (text) => text,
};

/** What the dock shows of a frame in a view, and so what copying it takes. */
export function frameText(frame: Frame, view: TextFrameView): string {
    return TEXT_OF_VIEW[view](textOf(frame));
}
