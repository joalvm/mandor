import { SaxesParser } from 'saxes';

import type { EditorDiagnostic } from './editor-diagnostic.js';

type Span = Pick<EditorDiagnostic, 'from' | 'to'>;

/** What the parser said first, over the stretch of text it was reading when it said it. */
type XmlError = Span & { message: string };

/** The tag that starts at an offset, through its `>`, or to the end when it never closes. */
function tagAt(text: string, from: number): Span {
    const end = text.indexOf('>', from);

    return { from, to: end === -1 ? text.length : end + 1 };
}

/**
 * The token the parser had just read when it stopped: it reports the offset of the next
 * character. A `>` belongs to the tag it closes; anything else runs from the last space or tag
 * edge before it to the next one after it, so an attribute or an entity is marked whole.
 */
function tokenBefore(text: string, position: number): Span {
    const last = Math.max(Math.min(position, text.length) - 1, 0);

    if (text.startsWith('>', last)) {
        return { from: Math.max(text.lastIndexOf('<', last), 0), to: last + 1 };
    }

    const run = text.slice(0, last).search(/[^\s<>]*$/);
    const rest = text.slice(last + 1).search(/[\s</>]/);

    return {
        from: text.startsWith('<', run - 1) ? run - 1 : run,
        to: rest === -1 ? text.length : last + 1 + rest,
    };
}

/**
 * The first error of a text. Past it the parser goes on guessing at what was meant, and the
 * margin marks one thing: the next is found once this is fixed. What is still open when the text
 * runs out is told at the end of it, so the start of every open tag is kept to point there.
 */
function firstError(text: string): XmlError | undefined {
    const parser = new SaxesParser({ position: false });
    const open: number[] = [];
    const errors: XmlError[] = [];
    let ended = false;

    parser.on('opentagstart', () => {
        open.push(text.lastIndexOf('<', parser.position - 1));
    });
    parser.on('closetag', () => {
        open.pop();
    });
    parser.on('error', (error) => {
        const innermost = ended ? open.at(-1) : undefined;
        const span =
            innermost === undefined ? tokenBefore(text, parser.position) : tagAt(text, innermost);

        errors.push({ ...span, message: error.message });
    });
    parser.write(text);
    ended = true;
    parser.close();

    return errors[0];
}

/**
 * The first error of an XML text, over the tag, attribute or entity that broke it. The parser is
 * plain script with nothing of Node in it: the window has no `Buffer`, and a library that reaches
 * for one takes every editor down with it the moment it loads.
 */
export function xmlDiagnostics(text: string): EditorDiagnostic[] {
    if (text.trim() === '') {
        return [];
    }

    const error = firstError(text);

    if (error === undefined) {
        return [];
    }

    return [{ from: error.from, message: error.message, severity: 'error', to: error.to }];
}
