import type { RequestItem } from '@mandor/schema';

import type { InteropParameter } from '../ir/interop-document.js';

/**
 * The rows of the request as the parameters the document names, in the order the read will
 * ask them back: the path, the query, the written headers, and the cookie last — one written
 * header is many of the document's. A row half typed is not a row, and a row switched off
 * still speaks: it is an optional the person documented.
 */
export function parametersOf(request: RequestItem): InteropParameter[] {
    const parameters: InteropParameter[] = [];
    const cookies: InteropParameter[] = [];

    for (const row of request.pathParams) {
        if (row.key === '') {
            continue;
        }

        parameters.push(parameterOf(row, 'path'));
    }

    for (const row of request.query) {
        if (row.key === '') {
            continue;
        }

        parameters.push(parameterOf(row, 'query'));
    }

    for (const row of request.headers) {
        if (row.key === '') {
            continue;
        }

        if (row.key.toLowerCase() === 'cookie') {
            cookies.push(...cookieOf(row.value));
        } else {
            parameters.push(parameterOf(row, 'header'));
        }
    }

    parameters.push(...cookies);

    return parameters;
}

/** The places whose rows are required by nature, whatever the row says. */
const ALWAYS_REQUIRED: readonly InteropParameter['in'][] = ['path'];

/** A path row is required by nature; the rest say so themselves, or the document never asked. */
function parameterOf(
    row: {
        key: string;
        value: string;
        required?: boolean | undefined;
        schema?: string | undefined;
    },
    place: InteropParameter['in'],
): InteropParameter {
    const schema = schemaOf(row.schema);

    return {
        name: row.key,
        in: place,
        required: ALWAYS_REQUIRED.includes(place) || (row.required ?? false),
        value: row.value,
        ...(schema === undefined ? {} : { schema }),
    };
}

/**
 * One written cookie is many of the document's: the pairs it names are the cookie parameters
 * the read will find, none of them required, and none carrying a schema — the read never gave
 * the cookie one.
 */
function cookieOf(value: string): InteropParameter[] {
    return value
        .split(';')
        .map((pair) => pair.trim())
        .filter((pair) => pair !== '')
        .map((pair) => {
            const equals = pair.indexOf('=');
            const name = equals === -1 ? pair : pair.slice(0, equals);
            const inner = equals === -1 ? '' : pair.slice(equals + 1);

            return { name, in: 'cookie' as const, required: false, value: inner };
        });
}

/** The schema travels only when it is JSON: anything else the writer could not read back. */
function schemaOf(schema: string | undefined): string | undefined {
    if (schema === undefined || schema === '') {
        return undefined;
    }

    try {
        JSON.parse(schema);

        return schema;
    } catch {
        return undefined;
    }
}
