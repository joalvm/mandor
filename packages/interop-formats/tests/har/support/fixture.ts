import { readFileSync } from 'node:fs';

import type { InteropDocument } from '@mandor/interop-core';

import { documentSourceId } from '../../../src/har/document/document-source-id.js';
import { parseHarDocument } from '../../../src/har/document/parse-har-document.js';
import { documentToInterop } from '../../../src/har/import/document-to-interop.js';
import type { HarDocument, HarEntry } from '../../../src/har/document/har-schema.js';

/** The text of a file in `tests/fixtures`, as the user would drop it. */
export function fixtureText(name: string): string {
    return readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8');
}

/** The model a fixture reads into, the step before the resources a workspace holds. */
export function fixtureDocument(name: string): InteropDocument {
    const text = fixtureText(name);

    return documentToInterop(parseHarDocument(text), documentSourceId(text));
}

/** One entry the way a browser records it, with only what a test says. */
export function entryOf(
    method: string,
    url: string,
    rest: { request?: object; response?: object } = {},
): HarEntry {
    const harDocument = parseHarDocument(
        JSON.stringify({
            log: {
                entries: [
                    {
                        request: { method, url, headers: [], ...rest.request },
                        ...(rest.response === undefined ? {} : { response: rest.response }),
                    },
                ],
            },
        }),
    );

    const [entry] = harDocument.log.entries;

    if (entry === undefined) {
        throw new Error('the recording has no entry');
    }

    return entry;
}

/** A recording of the entries given, as the parser would hand it over. */
export function harOf(entries: readonly HarEntry[], pages?: { title?: string }[]): HarDocument {
    return { log: { entries: [...entries], ...(pages === undefined ? {} : { pages }) } };
}
