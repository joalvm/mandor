import { pathParamsOf, type Degradation } from '@mandor/interop-core';
import { exampleOverrides, type RequestExample, type RequestItem } from '@mandor/schema';

import type { BrunoExample, BrunoRow } from '../document/bruno-tree.js';
import { requestBodyOf } from './body-of.js';
import { queryOfUrl } from './query-of-url.js';
import { linesOf } from './request-lines.js';

const TYPE_OF_BODY = new Map([
    ['json', 'application/json'],
    ['xml', 'application/xml'],
    ['html', 'text/html'],
    ['text', 'text/plain'],
    ['binary', 'application/octet-stream'],
]);

type ExampleMapping = { example: RequestExample; degradations: Degradation[] };

function isContentType({ name }: BrunoRow): boolean {
    return name.toLowerCase() === 'content-type';
}

/** The headers it answers with, when they say more than the type, which has its own field. */
function headersOf(rows: readonly BrunoRow[]): Pick<RequestExample, 'headers'> {
    const named = rows.filter(({ name }) => name.trim() !== '');

    return named.every(isContentType)
        ? {}
        : { headers: named.map(({ name, value }): [string, string] => [name, value]) };
}

/** Of the request it answered, Mandor keeps what it changes of `parent`. */
function requestOf(example: BrunoExample, parent: RequestItem): ExampleMapping {
    const answer = answerOf(example);

    if (example.request === undefined) {
        return { example: answer, degradations: [] };
    }

    const { url, headers, params, pathParams } = example.request;
    const body = requestBodyOf(example.request.body);
    const query = queryOfUrl(url, params);
    const request = exampleOverrides(parent, {
        ...parent,
        query: linesOf(query.rows),
        headers: linesOf(headers),
        pathParams: pathParamsOf(query.url, pathParams).lines,
        body: body.body,
        description: example.description === '' ? parent.description : example.description,
    });

    return {
        example: request === undefined ? answer : { ...answer, request },
        degradations: body.degradations,
    };
}

function answerOf({ name, status, headers, bodyType, body }: BrunoExample): RequestExample {
    const said = headers.find(isContentType)?.value;

    return {
        name: name === '' ? status : name,
        status: status === '' ? 'default' : status,
        contentType: said ?? TYPE_OF_BODY.get(bodyType) ?? '',
        body,
        ...headersOf(headers),
    };
}

/** The examples of a request as Mandor keeps them, and what could not come along. */
export function examplesOf(
    examples: readonly BrunoExample[],
    parent: RequestItem,
): { examples: RequestExample[]; degradations: Degradation[] } {
    const mapped = examples.map((example) => requestOf(example, parent));

    return {
        examples: mapped.map(({ example }) => example),
        degradations: mapped.flatMap(({ degradations }) => degradations),
    };
}
