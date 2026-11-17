import { collectionStore, exampleResource, itemPartsOf } from '@mandor/collections';
import type { ErrorCode } from '@mandor/ipc';
import {
    exampleKey,
    uniqueExampleName,
    type HttpResponse,
    type RequestExample,
    type RequestLine,
} from '@mandor/schema';
import { originName } from '@mandor/shell';

import { syncBridge } from '../../../app/sync-bridge.js';
import { exampleOf } from './example-of.js';
import { generatedSchema } from './example-schema.js';
import { openExample } from './open-example.js';
import { writeExampleParts } from './write-example-parts.js';

/**
 * The example a response stands for: the answer, the schema its body tells, and the params it was
 * sent with, pinned — they tell it apart from another example of its status that answers with
 * another shape, `fields=id` or `paginate=true`. A body that is not JSON tells no schema.
 */
function keptExample(response: HttpResponse, query: readonly RequestLine[]): RequestExample {
    const example = exampleOf(response);
    const schema = generatedSchema(example.body);
    const pinned = query.filter((line) => line.enabled && line.key.trim() !== '');

    return {
        ...example,
        ...(schema !== null && { schema }),
        ...(pinned.length > 0 && { request: { query: pinned } }),
    };
}

/**
 * Keeps a response as an example of the request it answered, at once and without waiting for
 * Ctrl+S, shows it under its request in the tree and opens it kept. A request saved nowhere has
 * no file to hold it, and nothing is written. What goes to the file is the answer main gave back
 * with every secret hidden; if main refuses, nothing is written. Answers the code of the refusal,
 * or nothing once it is written.
 */
export async function saveResponseAsExample(
    itemResource: string,
    response: HttpResponse,
    query: readonly RequestLine[] = [],
): Promise<ErrorCode | null> {
    const parts = itemPartsOf(itemResource);

    if (parts === null) {
        return null;
    }

    const hidden = await syncBridge.request.hideSecrets(response);

    if (!hidden.ok) {
        return hidden.error.code;
    }

    let kept = '';
    const code = await writeExampleParts(itemResource, (disk) => {
        const example = keptExample(hidden.value, query);

        kept = uniqueExampleName(disk.examples, example.name);

        return { examples: [...disk.examples, { ...example, name: kept }] };
    });

    if (code === null) {
        collectionStore.getState().openExamples(parts.workspaceId, parts.path, true);
        openExample(
            exampleResource(originName(), parts.workspaceId, parts.path, exampleKey(kept)),
            {
                beside: false,
                preview: false,
            },
        );
    }

    return code;
}
