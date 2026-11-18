import { z } from 'zod';

import { parseResourceUri } from './parse-resource-uri.js';

/**
 * The border check. Session files and markdown links carry text written by someone else, and
 * only text that names a resource of this repo gets past here.
 */
export const resourceUriSchema = z.string().refine(namesAResource, {
    error: 'Not an Mandor resource URI',
});

function namesAResource(value: string): boolean {
    try {
        parseResourceUri(value);

        return true;
    } catch {
        return false;
    }
}
