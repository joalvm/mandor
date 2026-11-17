import type { InteropParameter } from '@mandor/interop-core';

import type { PostmanUrl } from '../document/postman-collection-schema.js';

type QueryRow = NonNullable<PostmanUrl['query']>[number];

export type UrlParts = {
    url: string;
    parameters: InteropParameter[];
    hash?: string;
};

/** `:name` as a whole segment of the path, and not the `:8080` of a host. */
const PATH_VARIABLE = /(^|\/):([A-Za-z_][\w.-]*)(?=\/|$)/g;

/**
 * The address of a request in the three parts Mandor keeps apart: the url with no query and
 * no hash, the parameters (path ones from `:name`, query ones from the rows), and the hash.
 */
export function urlOf(url: PostmanUrl | undefined): UrlParts {
    const [beforeHash, hash] = splitAt(rawUrlOf(url), '#');
    const [base, query] = splitAt(beforeHash, '?');
    const names = [...new Set([...base.matchAll(PATH_VARIABLE)].map((found) => String(found[2])))];
    const parts: UrlParts = {
        url: base.replace(PATH_VARIABLE, '$1{$2}'),
        parameters: [
            ...names.map((name) => pathParameter(name, url)),
            ...queryParameters(url?.query ?? rowsOfQuery(query)),
        ],
    };

    return hash === undefined ? parts : { ...parts, hash };
}

function splitAt(text: string, mark: string): [string, string | undefined] {
    const at = text.indexOf(mark);

    return at === -1 ? [text, undefined] : [text.slice(0, at), text.slice(at + 1)];
}

function rawUrlOf(url: PostmanUrl | undefined): string {
    if (url === undefined) {
        return '';
    }

    if (url.raw !== undefined && url.raw !== null) {
        return url.raw;
    }

    const protocol = url.protocol ? `${url.protocol}://` : '';
    const port =
        url.port === undefined || url.port === null || url.port === ''
            ? ''
            : `:${String(url.port)}`;
    const path = listOf(url.path).join('/');

    return `${protocol}${listOf(url.host).join('.')}${port}${path === '' ? '' : `/${path}`}`;
}

function listOf(value: string | string[] | null | undefined): string[] {
    if (value === undefined || value === null) {
        return [];
    }

    return Array.isArray(value) ? value : [value];
}

function pathParameter(name: string, url: PostmanUrl | undefined): InteropParameter {
    const variable = url?.variable?.find((each) => each.key === name);

    return { name, in: 'path', required: true, enabled: true, value: variable?.value ?? '' };
}

/**
 * The rows of the query as text, for a url written as text: `name=value` split at the first `=`,
 * a name alone with an empty value, and the value as written, encoded or not.
 */
function rowsOfQuery(query: string | undefined): QueryRow[] {
    return (query ?? '').split('&').map((pair) => {
        const [key, value] = splitAt(pair, '=');

        return { key, value: value ?? '' };
    });
}

function queryParameters(rows: readonly QueryRow[]): InteropParameter[] {
    return rows.flatMap((row) => {
        if (row.key === undefined || row.key === null || row.key.trim() === '') {
            return [];
        }

        return [
            {
                name: row.key,
                in: 'query',
                required: false,
                enabled: row.disabled !== true,
                value: row.value ?? '',
            },
        ];
    });
}
