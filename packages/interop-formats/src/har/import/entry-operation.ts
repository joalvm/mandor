import type {
    InteropOperation,
    InteropParameter,
    InteropResponseExample,
} from '@mandor/interop-core';

import type { HarEntry } from '../document/har-schema.js';
import { exampleBodyOf, postDataBodyOf } from './har-body.js';
import { baseMime } from './text-mime.js';

/** Headers the transport writes itself; a recorded value would lie about the next send. */
export const DROPPED_HEADERS = [
    'host',
    'content-length',
    'connection',
    'transfer-encoding',
    'keep-alive',
    'upgrade',
] as const;

/** How many responses of a request stay as examples; the rest is counted, not kept. */
export const MAX_EXAMPLES = 5;

type Answer = NonNullable<HarEntry['response']>;

type Examples = {
    examples: InteropResponseExample[];
    dropped: number;
    binary: string[];
};

/** The entries of one (method, URL) and what they become: the first one speaks, the rest answer. */
export function operationOf(input: {
    entries: readonly [HarEntry, ...HarEntry[]];
    url: URL;
    method: string;
    summary: string;
}): InteropOperation {
    const { entries, url, method, summary } = input;
    const [first] = entries;
    const { body, binary } = postDataBodyOf(first.request.postData);
    const answers = examplesOf(entries);
    const name = `${url.host} / ${summary}`;

    return {
        name,
        channel: name,
        direction: 'outgoing',
        security: [],
        http: {
            method,
            path: '',
            url: url.origin + url.pathname,
            group: [url.host],
            summary,
            tags: [],
            parameters: [...queryOf(url), ...headersOf(first)],
            requestBody: body,
            responses: answers.examples,
            security: null,
        },
        extras: {
            ...(entries.length > 1 ? { mergedEntries: entries.length - 1 } : {}),
            ...(answers.dropped > 0 ? { droppedExamples: answers.dropped } : {}),
            ...(answers.binary.length > 0 ? { binaryExamples: answers.binary } : {}),
            ...(binary && body !== undefined ? { binaryBody: body.contentType } : {}),
        },
    };
}

function queryOf(url: URL): InteropParameter[] {
    return [...url.searchParams].map(([name, value]) => ({
        name,
        in: 'query',
        required: false,
        value,
        enabled: true,
    }));
}

function headersOf(entry: HarEntry): InteropParameter[] {
    return entry.request.headers
        .filter((header) => !isDropped(header.name))
        .map((header) => ({
            name: header.name,
            in: 'header',
            required: false,
            value: header.value,
            enabled: true,
        }));
}

function isDropped(name: string): boolean {
    const lower = name.toLowerCase();

    return lower.startsWith(':') || DROPPED_HEADERS.some((dropped) => dropped === lower);
}

function examplesOf(entries: readonly HarEntry[]): Examples {
    const answers = entries.flatMap((entry) =>
        entry.response !== undefined && entry.response.status > 0 ? [entry.response] : [],
    );
    const taken = new Set<string>();
    const examples: InteropResponseExample[] = [];
    const binary: string[] = [];

    for (const answer of answers.slice(0, MAX_EXAMPLES)) {
        const name = uniqueName(`${String(answer.status)} ${answer.statusText}`.trim(), taken);
        const { body, binary: isBinary } = exampleBodyOf(answer.content);

        examples.push({ name, status: String(answer.status), contentType: typeOf(answer), body });

        if (isBinary) {
            binary.push(name);
        }
    }

    return { examples, dropped: Math.max(0, answers.length - MAX_EXAMPLES), binary };
}

function typeOf(answer: Answer): string {
    const header = answer.headers.find((each) => each.name.toLowerCase() === 'content-type');

    return baseMime(header?.value ?? answer.content?.mimeType ?? '');
}

function uniqueName(base: string, taken: Set<string>): string {
    let name = base;

    for (let count = 2; taken.has(name); count += 1) {
        name = `${base} (${String(count)})`;
    }

    taken.add(name);

    return name;
}
