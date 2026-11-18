import { FORMAT_BYTES } from '@mandor/ipc';
import type { HttpResponse, ResponseBody } from '@mandor/schema';
import { detectedFormat, formattedJsonc, languageOfFormat, type EditorLanguage } from '@mandor/ui';

import { bodyKindOf, contentTypeOf } from '../../../response/lib/body-views.js';

export type BodyChange =
    | { kind: 'empty' }
    | { after: string; before: string; kind: 'text'; language: EditorLanguage }
    | { kind: 'opaque'; same: boolean };

/** What a body that is not shown as text says: that there is none, or whether the two match. */
export function bodyNoteOf(
    change: Exclude<BodyChange, { kind: 'text' }>,
): 'bodyDifferent' | 'bodyEmpty' | 'bodySame' {
    if (change.kind === 'empty') {
        return 'bodyEmpty';
    }

    return change.same ? 'bodySame' : 'bodyDifferent';
}

/** How much of a body is read to say whether it is JSON when the server did not say. */
const SAMPLE_CHARS = 4096;

/** The text of a body that stayed in memory as text; no body is the empty text. */
function textOf(body: ResponseBody | null): string | null {
    if (body === null) {
        return '';
    }

    return body.kind === 'inline' && body.encoding === 'utf8' ? body.text : null;
}

/** JSON is laid out so only what moved shows; any other text is compared as it came. */
function comparable(response: HttpResponse, text: string): string {
    const kind = bodyKindOf(contentTypeOf(response), text.slice(0, SAMPLE_CHARS));

    if (kind !== 'json') {
        return text;
    }

    return formattedJsonc(text) ?? text;
}

/** What names the bytes of a body without reading them: its text, its base64 or its file. */
function identityOf(body: ResponseBody | null): string {
    if (body === null) {
        return 'none';
    }

    if (body.kind === 'stored') {
        return `ref:${body.ref}`;
    }

    if (body.encoding === 'utf8') {
        return `text:${body.text}`;
    }

    return `base64:${body.data}`;
}

/** Both texts laid out, and the language of the side that has one, to colour what moved. */
function textChange(
    before: HttpResponse,
    left: string,
    after: HttpResponse,
    right: string,
): BodyChange {
    const first = comparable(before, left);
    const second = comparable(after, right);

    return {
        after: second,
        before: first,
        kind: 'text',
        language: languageOfFormat(detectedFormat(second === '' ? first : second)),
    };
}

/**
 * The body of two responses, side against side. Text that stayed in memory is handed over whole,
 * each side laid out, and the diff editor finds the lines. A body that was written to a file, one that is not text, or one too large to lay out is
 * compared by what names it and says only whether the two are the same: reading megabytes to
 * show lines would freeze the window, and the bytes of an image are not lines.
 */
export function bodyDiff(before: HttpResponse, after: HttpResponse): BodyChange {
    const left = textOf(before.body);
    const right = textOf(after.body);

    if (
        left !== null &&
        right !== null &&
        left.length <= FORMAT_BYTES &&
        right.length <= FORMAT_BYTES
    ) {
        return left === '' && right === ''
            ? { kind: 'empty' }
            : textChange(before, left, after, right);
    }

    return { kind: 'opaque', same: identityOf(before.body) === identityOf(after.body) };
}
