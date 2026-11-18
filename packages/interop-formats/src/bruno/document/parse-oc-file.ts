import { documentRootOf, type InteropFile } from '@mandor/interop-core';
import type { z } from 'zod';

import { BrunoParseError } from './bruno-parse-error.js';
import { parseValue } from './parse-value.js';

/** The file as the schema reads it; a file that is not YAML says so. */
export function parseOcFile<T extends z.ZodType>(file: InteropFile, schema: T): z.output<T> {
    const root = documentRootOf(file.text);

    if (root === null) {
        throw new BrunoParseError([`${file.path}: the file is not YAML`]);
    }

    return parseValue(root, file.path, schema);
}
