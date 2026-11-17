import { collectionStore, exampleItemOf, examplePartsOf, itemPartsOf } from '@mandor/collections';
import type { ErrorCode } from '@mandor/ipc';
import {
    exampleKey,
    exampleKeys,
    examplesApart,
    uniqueExampleName,
    type RequestExample,
} from '@mandor/schema';
import { bridge } from '@mandor/shell';

import { followExample, resourceOf } from './example-operations.js';
import { requestOf } from './load-request.js';
import { writeExampleParts } from './write-example-parts.js';

type ExampleOnDisk = { code: ErrorCode } | { example: RequestExample | undefined };

async function exampleOnDisk(item: string, key: string): Promise<ExampleOnDisk> {
    const parts = itemPartsOf(item);

    if (parts === null) {
        return { example: undefined };
    }

    const read = await bridge.collections.readItem({
        path: parts.path,
        workspaceId: parts.workspaceId,
    });

    if (!read.ok) {
        return { code: read.error.code };
    }

    const disk = requestOf(read.value);

    if (disk === null) {
        return { code: 'fs-read' };
    }

    return { example: examplesApart(disk.examples)[exampleKeys(disk.examples).indexOf(key)] };
}

/** Writes the example at the destination, then takes it from where it was. Answers its new name. */
async function carry(
    example: RequestExample,
    from: { item: string; key: string },
    target: string,
): Promise<{ code: ErrorCode } | { name: string }> {
    let name = example.name;
    const written = await writeExampleParts(target, (disk) => {
        name = uniqueExampleName(disk.examples, example.name);

        return { examples: [...disk.examples, { ...example, name }] };
    });
    const taken =
        written ??
        (await writeExampleParts(from.item, (disk) => {
            const keys = exampleKeys(disk.examples);

            return {
                examples: examplesApart(disk.examples).filter((_, at) => keys[at] !== from.key),
            };
        }));

    return taken === null ? { name } : { code: taken };
}

/**
 * Carries an example to another request, under a name free there. It is written at the destination
 * first and only then taken from where it was, so a refusal halfway leaves two copies and never
 * none. Its tab, draft and answer follow it, and the destination opens to show where it landed.
 */
export async function moveExample(resource: string, target: string): Promise<ErrorCode | null> {
    const parts = examplePartsOf(resource);
    const item = exampleItemOf(resource);
    const destination = itemPartsOf(target);

    if (parts === null || item === null || destination === null || item === target) {
        return null;
    }

    const found = await exampleOnDisk(item, parts.key);

    if ('code' in found) {
        return found.code;
    }

    if (found.example === undefined) {
        return null;
    }

    const carried = await carry(found.example, { item, key: parts.key }, target);

    if ('code' in carried) {
        return carried.code;
    }

    const moved = resourceOf(target, exampleKey(carried.name));

    if (moved !== null) {
        followExample(resource, moved, carried.name);
    }

    collectionStore.getState().openExamples(destination.workspaceId, destination.path, true);

    return null;
}
