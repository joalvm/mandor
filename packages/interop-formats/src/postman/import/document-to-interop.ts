import { chooseByKey, type InteropDocument, type KeyHandlers } from '@mandor/interop-core';

import type { PostmanDocument } from '../document/parse-postman-document.js';
import { collectionToInterop } from './collection-to-interop.js';
import { environmentToInterop } from './environment-to-interop.js';

/** Each of the three kinds of file has its own way to the intermediate document. */
const DOCUMENTS: KeyHandlers<'kind', PostmanDocument, InteropDocument> = {
    collection: (document) => collectionToInterop(document.collection),
    environment: (document) => environmentToInterop('environment', document.environment),
    globals: (document) => environmentToInterop('globals', document.environment),
};

/** A parsed Postman file as the intermediate document. */
export function documentToInterop(document: PostmanDocument): InteropDocument {
    return chooseByKey(DOCUMENTS, document.kind, document);
}
