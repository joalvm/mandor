/**
 * The envelope a websocket connection wraps its outgoing message in: a JSON template with two
 * holes. `{{event}}` takes the name of the event and `{{payload}}` the message itself, raw.
 * There is no standard envelope on a websocket — every backend invented its own — so the
 * template is data on the connection and the collection item stays the pure message.
 */

/** One slice of a frame template: the text as written, or a hole the send fills. */
export type FramePart = { kind: 'event' } | { kind: 'payload' } | { kind: 'text'; text: string };

/** What the send fills the holes with: the name of the event and the message, raw. */
type FrameValues = { event: string; payload: string };

type PartOf<Kind extends FramePart['kind']> = Extract<FramePart, { kind: Kind }>;

/** What a reading of a template answers: its parts in order, or why it cannot be one. */
export type ParsedFrameTemplate = { ok: true; parts: FramePart[] } | { ok: false; reason: string };

const TOKEN = /\{\{\s*(?<name>event|payload)\s*\}\}/gu;

/** The holes a template can open, each named as the token that opens it. */
const HOLES: readonly FramePart[] = [{ kind: 'event' }, { kind: 'payload' }];

/**
 * What each slice becomes in the frame: the event as the JSON string it is, the payload
 * verbatim — it is already JSON — and the text between holes exactly as it was written.
 */
const FILL: { [Kind in FramePart['kind']]: (part: PartOf<Kind>, values: FrameValues) => string } = {
    event: (_part, values) => JSON.stringify(values.event),
    payload: (_part, values) => values.payload,
    text: (part) => part.text,
};
const QUOTED_TOKEN = /["']\s*\{\{\s*(event|payload)\s*\}\}\s*["']/u;

// What a hole stands for while the JSON of the template is proven: a string, because a hole
// is only legal where a whole value goes, and a control character the writer cannot type.
const STAND_IN = '"\\u0000"';

/**
 * Reads the template into parts, and refuses one that could never leave as a frame: JSON that
 * does not parse, or a hole written inside quotes, where it would arrive as text and not as
 * the value it stands for.
 */
export function parseFrameTemplate(template: string): ParsedFrameTemplate {
    const quoted = QUOTED_TOKEN.exec(template);

    if (quoted !== null) {
        return {
            ok: false,
            reason: `the token ${quoted[0].trim()} is inside quotes: a frame token stands as a whole JSON value, without quotes of its own`,
        };
    }

    try {
        JSON.parse(template.replace(TOKEN, STAND_IN));
    } catch (error) {
        return { ok: false, reason: `the template is not valid JSON: ${String(error)}` };
    }

    return { ok: true, parts: partsOf(template) };
}

/** Fills the holes in, each slice as `FILL` says it goes. */
export function applyFrameTemplate(parts: FramePart[], values: FrameValues): string {
    return parts.map((part) => filledBy(part.kind, part, values)).join('');
}

/** The kind and the slice travel apart, so the compiler pairs the entry with its own slice. */
function filledBy<Kind extends FramePart['kind']>(
    kind: Kind,
    part: PartOf<Kind>,
    values: FrameValues,
): string {
    return FILL[kind](part, values);
}

function partsOf(template: string): FramePart[] {
    const parts: FramePart[] = [];
    let at = 0;

    for (const match of template.matchAll(TOKEN)) {
        const start = match.index;

        if (start > at) {
            parts.push({ kind: 'text', text: template.slice(at, start) });
        }

        parts.push(...HOLES.filter((hole) => hole.kind === match.groups?.['name']));
        at = start + match[0].length;
    }

    if (at < template.length) {
        parts.push({ kind: 'text', text: template.slice(at) });
    }

    return parts;
}
