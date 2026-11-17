import {
    degradation,
    type Degradation,
    type InteropDocument,
    type InteropGroup,
} from '@mandor/interop-core';
import { METHOD_PATTERN } from '@mandor/schema';

import type { HarDocument, HarEntry } from '../document/har-schema.js';
import { operationOf } from './entry-operation.js';

type Target =
    { kind: 'target'; url: URL; method: string } | { kind: 'left-out'; note: Degradation };

type Bucket = { entries: [HarEntry, ...HarEntry[]]; url: URL; method: string; summary: string };

const TIMINGS_NOTE = degradation('harExtrasNotImported');

/**
 * A recording to the model every importer shares: one folder per host, one operation per method
 * and URL. The entries that repeat one are merged into it, and what cannot be sent is named.
 */
export function documentToInterop(har: HarDocument, sourceId: string): InteropDocument {
    const { buckets, notes } = bucketsOf(har.log.entries);
    const operations = buckets.map((bucket) => operationOf(bucket));
    const hosts = [...new Set(buckets.map((bucket) => bucket.url.host))];

    return {
        name: nameOf(har, hosts),
        sourceId,
        servers: [],
        security: {},
        channels: operations.map((operation) => ({
            name: operation.name,
            address: operation.name,
            extras: {},
        })),
        operations,
        defaultSecurity: [],
        payloadSchemas: {},
        notes: buckets.length > 0 ? [...notes, TIMINGS_NOTE] : notes,
        extras: {},
        groups: hosts.map(groupOf),
    };
}

function bucketsOf(entries: readonly HarEntry[]): { buckets: Bucket[]; notes: Degradation[] } {
    const buckets = new Map<string, Bucket>();
    const spellings = new Map<string, number>();
    const notes: Degradation[] = [];

    for (const [index, entry] of entries.entries()) {
        const target = targetOf(entry, index + 1);

        if (target.kind === 'left-out') {
            notes.push(target.note);
            continue;
        }

        const key = keyOf(target);
        const known = buckets.get(key);

        if (known === undefined) {
            buckets.set(key, bucketOf(entry, target, spellings));
        } else {
            known.entries.push(entry);
        }
    }

    return { buckets: [...buckets.values()], notes };
}

function targetOf(entry: HarEntry, position: number): Target {
    const { url: written, method: spelled } = entry.request;
    const url = URL.canParse(written) ? new URL(written) : undefined;
    const method = spelled.toUpperCase();

    if (url === undefined || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
        return {
            kind: 'left-out',
            note: degradation('harEntryBadUrl', { position: String(position), url: written }),
        };
    }

    if (!METHOD_PATTERN.test(method)) {
        return {
            kind: 'left-out',
            note: degradation('harEntryBadMethod', { position: String(position), method: spelled }),
        };
    }

    return { kind: 'target', url, method };
}

/** The fragment never reaches the wire, so two URLs that differ only by it are one request. */
function keyOf(target: { url: URL; method: string }): string {
    const url = new URL(target.url);

    url.hash = '';

    return `${target.method} ${url.href}`;
}

/** The second request of a path that differs by its query is told from the first by a number. */
function bucketOf(
    entry: HarEntry,
    target: { url: URL; method: string },
    spellings: Map<string, number>,
): Bucket {
    const { url, method } = target;
    const base = `${method} ${url.pathname}`;
    const spelling = `${url.host} ${base}`;
    const count = (spellings.get(spelling) ?? 0) + 1;

    spellings.set(spelling, count);

    return {
        entries: [entry],
        url,
        method,
        summary: count === 1 ? base : `${base} (${String(count)})`,
    };
}

function nameOf(har: HarDocument, hosts: readonly string[]): string {
    const title = (har.log.pages ?? [])
        .map((page) => (page.title ?? '').trim())
        .find((each) => each !== '');

    if (title !== undefined) {
        return title;
    }

    const [first, ...others] = hosts;

    if (first === undefined) {
        return 'HAR';
    }

    return others.length === 0
        ? `HAR ${first}`
        : `HAR ${first} and ${String(others.length)} more hosts`;
}

function groupOf(host: string): InteropGroup {
    return { path: [host], security: null, scripts: [], extras: {} };
}
