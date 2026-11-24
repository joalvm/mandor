import { ownScriptsOrNothing } from '../script/own-scripts.js';
import type { RequestBody } from './request-body.js';
import type { RequestItem } from './request-item.js';

/** The lines somebody sends, named only: a row half typed is not a line of the file yet. */
function named<T extends { key: string }>(lines: readonly T[]): T[] {
    return lines.filter((line) => line.key !== '');
}

/** A list with no named line is no list: the key leaves the file. */
function namedOrNothing<T extends { key: string }>(lines: readonly T[]): T[] | undefined {
    const kept = named(lines);

    return kept.length === 0 ? undefined : kept;
}

/** A body made of fields keeps the named ones: a half typed field is not in the file. */
function withNamedFields<Body extends { fields: readonly { key: string }[] }>(body: Body): Body {
    return { ...body, fields: named(body.fields) };
}

/** What the file keeps of the body. No body leaves the key out. */
function bodyOf(body: RequestBody): RequestBody | undefined {
    if (body.type === 'none') {
        return undefined;
    }

    if ('fields' in body) {
        return withNamedFields(body);
    }

    return body;
}

/**
 * The keys a request writes beside the envelope of the collection. All of them are named every
 * time, with nothing behind the ones the request does not have: that is what tells the writer
 * the field is gone. The settings are written whole: a turned-off check has to show in the
 * diff of the repo. A line the user is still writing travels in the request but not in the
 * file: the file receives the named ones only.
 */
export function requestItemBody(request: RequestItem): Record<string, unknown> {
    const { method, url, body, bodySchema, examples, settings, description } = request;

    return {
        method,
        url: url === '' ? undefined : url,
        query: namedOrNothing(request.query),
        headers: namedOrNothing(request.headers),
        pathParams: namedOrNothing(request.pathParams),
        body: bodyOf(body),
        bodySchema,
        examples: examples.length === 0 ? undefined : examples,
        settings,
        description,
        scripts: ownScriptsOrNothing(request.scripts),
    };
}
