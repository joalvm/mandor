import type { KeyValueAutoLine } from '@mandor/env';

import type { HeaderAutoLine } from './header-auto-lines.js';

/** The line that says why a row of the send is there, by the header it names. */
const SAID_BY_NAME: Readonly<Record<string, string>> = {
    accept: 'headerAutoAccept',
    'accept-encoding': 'headerAutoAcceptEncoding',
    'cache-control': 'headerAutoCacheControl',
    'content-length': 'headerAutoContentLength',
    connection: 'headerAutoConnection',
    host: 'headerAutoHost',
    'user-agent': 'headerAutoUserAgent',
};

/** A row a tab decides: the words it is said with, and the tab its deep link lands on. */
type Decided = { description: string; follow: string; section: 'auth' | 'body' };

const DECIDED_BY_KIND: Readonly<Partial<Record<HeaderAutoLine['kind'], Decided>>> = {
    auth: { description: 'headerAutoAuth', follow: 'headerAutoAuthFollow', section: 'auth' },
    contentType: {
        description: 'headerAutoContentType',
        follow: 'headerAutoBodyFollow',
        section: 'body',
    },
};

/** Why the row is there, in words; the deep link only where a tab holds the decision. */
export function headerAutoRowOf(
    each: HeaderAutoLine,
    labels: (key: string) => string,
): KeyValueAutoLine {
    const decided = DECIDED_BY_KIND[each.kind];
    const said = SAID_BY_NAME[each.name.toLowerCase()];
    const line = {
        calculated: each.calculated,
        id: each.id,
        locked: true,
        name: each.name,
        overriddenBy: each.overriddenBy,
        value: each.value,
    };

    if (decided !== undefined) {
        return {
            ...line,
            description: labels(decided.description),
            follow: { label: labels(decided.follow) },
        };
    }

    return { ...line, description: said === undefined ? '' : labels(said) };
}

/** The tab a deep link from a row lands on: the one that holds what the row stands for. */
export function headerAutoSectionOf(
    lines: readonly HeaderAutoLine[],
    id: string,
): 'auth' | 'body' | undefined {
    const line = lines.find((each) => each.id === id);

    return line === undefined ? undefined : DECIDED_BY_KIND[line.kind]?.section;
}
