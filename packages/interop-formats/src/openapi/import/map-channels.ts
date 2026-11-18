import type { InteropChannel } from '@mandor/interop-core';

import { asRecord, recordAt, textAt } from '../document/node-access.js';
import { unknownKeys } from '../document/unknown-keys.js';
import { HTTP_METHODS } from './http-methods.js';

const KNOWN = [...HTTP_METHODS, 'description', 'parameters', '$ref'];

/** One channel per path: the address the requests travel, and what the path says about itself. */
export function channelsOf(document: Record<string, unknown>): InteropChannel[] {
    return Object.entries(recordAt(document, 'paths')).map(([path, item]) => {
        const node = asRecord(item);

        return {
            name: path,
            address: path,
            description: textAt(node, 'description'),
            extras: unknownKeys(node, KNOWN),
        };
    });
}
