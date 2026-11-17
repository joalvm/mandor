import { itemPartsOf, loadCollection } from '@mandor/collections';
import type { ErrorCode } from '@mandor/ipc';
import { REQUEST_ITEM_KIND, type RequestItem } from '@mandor/schema';
import { bridge } from '@mandor/shell';

import { requestsStore } from '../requests-store.js';

import { requestOf } from './load-request.js';

/** The parts of a request that belong to its examples; the rest of the file is not touched. */
export type ExampleParts = Pick<RequestItem, 'examples'>;

/** What the window shows of the item agrees with the file at once: its draft too, if it has one. */
function patchWindow(itemResource: string, parts: ExampleParts): void {
    const state = requestsStore.getState();
    const shown = state.requests[itemResource];
    const pending = state.pendings[itemResource];

    if (shown !== undefined) {
        state.setRequest(itemResource, { ...shown, ...parts });
    }

    if (pending !== undefined) {
        state.setPending(itemResource, {
            before: pending.before === undefined ? undefined : { ...pending.before, ...parts },
            request: { ...pending.request, ...parts },
        });
    }
}

/**
 * The one place that writes the examples of a request, each with the schema of its answer. It
 * reads the file fresh, so what another view saved a moment ago is not stepped on, hands the
 * examples to `change`, and writes back only them. The request draft in the window and the
 * file's other keys are not its business. Once it is written the tree is read again, so the
 * examples under the request are the ones now on disk. Answers the code of the refusal, or
 * nothing once it is written.
 */
export async function writeExampleParts(
    itemResource: string,
    change: (parts: ExampleParts) => ExampleParts,
): Promise<ErrorCode | null> {
    const parts = itemPartsOf(itemResource);

    if (parts === null) {
        return null;
    }

    const read = await bridge.collections.readItem({
        path: parts.path,
        workspaceId: parts.workspaceId,
    });

    if (!read.ok) {
        return read.error.code;
    }

    const disk = requestOf(read.value);

    if (disk === null) {
        return 'fs-read';
    }

    const next: ExampleParts = change({ examples: disk.examples });
    const written = await bridge.collections.writeItem({
        fields: {
            examples: next.examples.length === 0 ? undefined : next.examples,
            kind: REQUEST_ITEM_KIND,
            name: disk.name,
            // An old file kept a schema per status here; its examples were read carrying them.
            ...(Object.hasOwn(read.value, 'responseSchemas') && { responseSchemas: undefined }),
        },
        path: parts.path,
        workspaceId: parts.workspaceId,
    });

    if (!written.ok) {
        return written.error.code;
    }

    patchWindow(itemResource, next);
    // The tree lists the examples under their request, and a write of the window is not one it hears.
    await loadCollection(parts.workspaceId);

    return null;
}
