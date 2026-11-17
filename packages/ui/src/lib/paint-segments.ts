/**
 * One stretch of a field's text, plain or carried by a variable. Plain stretches hold the
 * text around the tokens; toned ones hold the `{{name}}` exactly as the field stores it.
 */
type InputSegmentTone =
    /** Declared with a value: the field can resolve it. */
    | 'resolved'
    /** Declared, but its value is blank. */
    | 'empty'
    /** Nobody declared it. */
    | 'missing'
    /** A `{{` still open: the name is being written and nothing is promised yet. */
    | 'open'
    /** Declared and marked secret: the tone names it, never its value. */
    | 'secret';

export type InputSegment = {
    text: string;
    tone?: InputSegmentTone | undefined;
    /** The variable the stretch names, when the stretch is a token a pointer can land on. */
    name?: string | undefined;
    /** What a hover over the token may say before a richer surface opens. */
    title?: string | undefined;
};

/** The part name every token carries, so styles and hit-testing select by it. */
const VARIABLE_TOKEN_PART = 'variable-token';

/**
 * Fills a field's editable node from its segments: one text node per plain stretch, one
 * marked span per token. It replaces what the node held, so repainting the same field
 * twice never doubles a character, and it changes no text the caret could be standing in.
 */
export function paintSegments(node: HTMLElement, segments: readonly InputSegment[]): void {
    const fill = document.createDocumentFragment();

    for (const segment of segments) {
        // An empty stretch adds no child at all: a cleared field stays childless, which is
        // what lets the placeholder paint on `:empty`.
        if (segment.text === '') {
            continue;
        }

        if (segment.tone === undefined) {
            fill.append(document.createTextNode(segment.text));

            continue;
        }

        const token = document.createElement('span');

        token.dataset['part'] = VARIABLE_TOKEN_PART;
        token.dataset['tone'] = segment.tone;

        if (segment.name) {
            token.dataset['variable'] = segment.name;
        }

        if (segment.title !== undefined) {
            token.title = segment.title;
        }

        token.append(document.createTextNode(segment.text));
        fill.append(token);
    }

    node.replaceChildren(fill);
}
