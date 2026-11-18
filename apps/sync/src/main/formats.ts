import type { StartHostConfig } from '@mandor/host';
import {
    mandorFormatFor,
    brunoFormat,
    harFormat,
    insomniaFormat,
    openapiFormat,
    postmanFormat,
} from '@mandor/interop-formats';

/**
 * The documents Mandor Request reads and writes. OpenAPI, Postman, Insomnia, Bruno and HAR are
 * read here; all but HAR are written back, with the export. The workspace bundle goes both ways,
 * bound to this app: a bundle of the other is refused.
 */
export const SYNC_FORMATS: StartHostConfig['formats'] = [
    openapiFormat,
    postmanFormat,
    insomniaFormat,
    brunoFormat,
    harFormat,
    mandorFormatFor('sync'),
];
