import { FORMAT_BYTES, type ActivityRecord } from '@mandor/ipc';
import { detectedFormat, type PayloadFormat } from '@mandor/ui';

/** A frame as the window reads it: the text it was written in, or the bytes it arrived as. */
export type FramePayload = { kind: 'bytes'; bytes: Uint8Array } | { kind: 'text'; text: string };

/** What the bridge hands over of one frame: its payload and whether that payload is encoded. */
export type Frame = Pick<ActivityRecord, 'binary' | 'data'>;

const ENCODER = new TextEncoder();

/**
 * Where a text frame is encoded a stretch at a time to be weighed. Encoding it whole made a copy
 * as large as the frame, up to a hundred megabytes, only to read its length.
 */
const STRETCH = new Uint8Array(65_536);

/** The UTF-8 bytes of a text, counted through one small buffer and never copied whole. */
function utf8Length(text: string): number {
    let total = 0;
    let rest = text;

    while (rest.length > 0) {
        const { read, written } = ENCODER.encodeInto(rest, STRETCH);

        total += written;
        rest = rest.slice(read);
    }

    return total;
}

/** Base64 carries three bytes in every four characters, less the padding at the end. */
const BASE64_GROUP = 4;
const BASE64_BYTES = 3;

function decoded(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
}

/**
 * What one frame carries. Bytes cross the bridge as base64 — a frame that is not UTF-8 would be
 * destroyed by being read as text — and are decoded here, at the edge of the window, so nothing
 * past this reads a frame as anything other than what it is.
 */
export function framePayload(frame: Frame): FramePayload {
    if (frame.binary === true) {
        return { bytes: decoded(frame.data), kind: 'bytes' };
    }

    return { kind: 'text', text: frame.data };
}

/**
 * The bytes a binary frame opens with, and no more than that. A row shows a handful of them and
 * a frame is as large as the socket allowed, so only the head of the encoding is decoded: base64
 * carries whole bytes every four characters, and a cut on that boundary decodes on its own.
 */
export function frameHead(frame: Frame, count: number): Uint8Array {
    const head = frame.data.slice(0, Math.ceil(count / BASE64_BYTES) * BASE64_GROUP);
    const payload = framePayload({ binary: frame.binary, data: head });

    if (payload.kind === 'bytes') {
        return payload.bytes.subarray(0, count);
    }

    return ENCODER.encode(head).subarray(0, count);
}

/** How much of a frame too large to lay out is read to say what it is, as a response is read. */
const SAMPLE_CHARS = 4096;

/**
 * What the frame turned out to be. A frame that never was text is binary without reading a
 * byte of it: what travelled is an encoding, and reading that encoding would name it text. A
 * frame past the cut is shown as it came, so only its start is read: parsing the whole of one
 * took seconds, frozen, the moment it was opened.
 */
export function frameFormat(frame: Frame): PayloadFormat {
    if (frame.binary === true) {
        return 'binary';
    }

    if (frame.data.length > FORMAT_BYTES) {
        return detectedFormat(frame.data.slice(0, SAMPLE_CHARS));
    }

    return detectedFormat(frame.data);
}

/**
 * What a frame weighed on the wire. Text is measured in its UTF-8 bytes, never in the code
 * units of the string, and bytes in the ones the encoding carried: the base64 that brought
 * them is a third larger, and the timeline caps itself by what crossed the socket.
 */
export function frameByteLength(frame: Frame): number {
    if (frame.binary !== true) {
        return utf8Length(frame.data);
    }

    const padding = frame.data.endsWith('==') ? 2 : Number(frame.data.endsWith('='));

    return (frame.data.length / BASE64_GROUP) * BASE64_BYTES - padding;
}
