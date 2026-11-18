import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { InteropDocument } from '@mandor/interop-core';

/** What the workspace held after the fixture import was written, frozen as the writer's contract. */
export function heldDocumentOf(): InteropDocument {
    return JSON.parse(
        readFileSync(
            fileURLToPath(new URL('../fixtures/ida-vuelta-3.1.held.json', import.meta.url)),
            'utf8',
        ),
    ) as InteropDocument;
}
