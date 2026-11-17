import { type CollectionItem, collectionItemFields, parseCollectionItem } from '@mandor/schema';

import { documentOf } from '../disk/document-of.js';
import { documentTextWith } from '../disk/document-text.js';
import { parsedDocument } from '../disk/parsed-document.js';

/**
 * The text of an item file once `item` is written into it. The envelope goes at the top and the
 * body is flattened beside it, so the file reads as one thing and not as an item wrapping a
 * payload. Over an existing text the item is written inside its own document: comments, key
 * order and the keys this app does not understand survive. Over `null`, the file is new.
 *
 * A text that is not an item is a refusal: writing over it would destroy what it says.
 */
export function itemTextWith(text: string | null, item: CollectionItem): string {
    const fields = collectionItemFields(parseCollectionItem(collectionItemFields(item)));

    if (text === null) {
        return documentTextWith(documentOf(fields), {});
    }

    const document = parsedDocument(text);

    parseCollectionItem(document.toJS());

    return documentTextWith(document, fields);
}
