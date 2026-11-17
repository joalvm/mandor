// The typings of the parser are ambient, and an import cannot carry an ambient declaration into
// the projects that read this file: only a reference does.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./usebruno-lang.d.ts" />
import type { InteropFile } from '@mandor/interop-core';
import lang from '@usebruno/lang';

import { BrunoParseError } from './bruno-parse-error.js';

/** The parser throws a message that points at the line; the file it came from is added. */
function parsed(file: InteropFile, parse: (text: string) => unknown): unknown {
    try {
        return parse(file.text);
    } catch (error) {
        const message = String(error instanceof Error ? error.message : error);

        throw new BrunoParseError([`${file.path}: ${message.trim().split('\n', 1).join('')}`]);
    }
}

/** A request of the `.bru` language, as the loose JSON the parser gives. */
export function requestBruOf(file: InteropFile): unknown {
    return parsed(file, lang.bruToJsonV2);
}

/** The `folder.bru` of a folder and the `collection.bru` of a collection: the same language. */
export function collectionBruOf(file: InteropFile): unknown {
    return parsed(file, lang.collectionBruToJson);
}

/** An environment of the `.bru` language. */
export function environmentBruOf(file: InteropFile): unknown {
    return parsed(file, lang.bruToEnvJsonV2);
}
