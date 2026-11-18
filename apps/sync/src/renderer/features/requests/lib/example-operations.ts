import {
    collectionStore,
    exampleItemOf,
    examplePartsOf,
    exampleResource,
    itemPartsOf,
} from '@mandor/collections';
import type { ErrorCode } from '@mandor/ipc';
import {
    exampleKey,
    exampleKeys,
    examplesApart,
    uniqueExampleName,
    type RequestExample,
} from '@mandor/schema';
import { originName, shellStore } from '@mandor/shell';

import { requestsStore } from '../requests-store.js';

import { openExample } from './open-example.js';
import { writeExampleParts } from './write-example-parts.js';

/** An example is kept where the person asked for it, and not only looked at. */
const KEPT = { beside: false, preview: false };

export function resourceOf(itemResource: string, key: string): string | null {
    const parts = itemPartsOf(itemResource);

    return parts === null
        ? null
        : exampleResource(originName(), parts.workspaceId, parts.path, key);
}

/** The tab, the answer and the draft of an example go with it to the resource it now answers to. */
export function followExample(from: string, to: string, name: string): void {
    shellStore.getState().moveResource(from, to);
    requestsStore.getState().moveExample(from, to);

    const draft = requestsStore.getState().exampleDrafts[to];

    if (draft !== undefined) {
        requestsStore
            .getState()
            .setExampleDraft(to, { ...draft, example: { ...draft.example, name } });
    }
}

/**
 * Gives an example another name. The name is trimmed and, when another example already wears it,
 * numbered. Its resource follows the name: the tab, the draft and the answer of the send go to
 * the new one, so nothing the person had open is lost to a rename.
 */
export async function renameExample(resource: string, name: string): Promise<ErrorCode | null> {
    const parts = examplePartsOf(resource);
    const item = exampleItemOf(resource);
    const wanted = name.trim();

    if (parts === null || item === null || wanted === '') {
        return null;
    }

    let renamed = wanted;
    const code = await writeExampleParts(item, (disk) => {
        const index = exampleKeys(disk.examples).indexOf(parts.key);

        if (index === -1) {
            return disk;
        }

        renamed = uniqueExampleName(
            disk.examples.filter((_, at) => at !== index),
            wanted,
        );

        return {
            examples: disk.examples.map((each, at) =>
                at === index ? { ...each, name: renamed } : each,
            ),
        };
    });
    const moved = resourceOf(item, exampleKey(renamed));

    if (code !== null || moved === null || moved === resource) {
        return code;
    }

    followExample(resource, moved, renamed);

    return null;
}

/**
 * Copies an example right behind the original, under a name nobody wears, and opens the copy.
 * `copy` is the word the name takes: «Creado copia».
 */
export async function duplicateExample(resource: string, copy: string): Promise<ErrorCode | null> {
    const parts = examplePartsOf(resource);
    const item = exampleItemOf(resource);

    if (parts === null || item === null) {
        return null;
    }

    let made = '';
    const code = await writeExampleParts(item, (disk) => {
        const index = exampleKeys(disk.examples).indexOf(parts.key);
        const original = disk.examples[index];

        if (original === undefined) {
            return disk;
        }

        made = uniqueExampleName(disk.examples, `${original.name} ${copy}`);

        return {
            examples: [
                ...disk.examples.slice(0, index + 1),
                { ...original, name: made },
                ...disk.examples.slice(index + 1),
            ],
        };
    });
    const opened = made === '' ? null : resourceOf(item, exampleKey(made));

    if (code === null && opened !== null) {
        openExample(opened, KEPT);
    }

    return code;
}

/**
 * Takes examples out of their requests, one write for each request that loses some. The tab of
 * an example that went is left blank, and its draft where it was: the same as for a request that
 * was deleted. A request whose write is refused keeps its examples, and the first refusal is what
 * is answered.
 */
export async function removeExamples(resources: readonly string[]): Promise<ErrorCode | null> {
    const keysByItem = new Map<string, Map<string, string>>();

    for (const resource of resources) {
        const parts = examplePartsOf(resource);
        const item = exampleItemOf(resource);

        if (parts !== null && item !== null) {
            const keys = keysByItem.get(item) ?? new Map<string, string>();

            keysByItem.set(item, keys.set(parts.key, resource));
        }
    }

    let refused: ErrorCode | null = null;

    for (const [item, gone] of keysByItem) {
        const code = await writeExampleParts(item, (disk) => {
            const keys = exampleKeys(disk.examples);
            const kept = examplesApart(disk.examples);

            return { examples: kept.filter((_, at) => !gone.has(keys[at] ?? '')) };
        });

        if (code === null) {
            gone.forEach((resource) => {
                shellStore.getState().removeResource(resource);
            });
        }

        refused ??= code;
    }

    return refused;
}

/** A new example of a request, with the answer most people keep first, opened to be filled. */
export async function newExample(itemResource: string, name: string): Promise<ErrorCode | null> {
    const parts = itemPartsOf(itemResource);
    let made = '';

    const code = await writeExampleParts(itemResource, (disk) => {
        made = uniqueExampleName(disk.examples, name);

        const example: RequestExample = {
            body: '',
            contentType: 'application/json',
            name: made,
            status: '200',
        };

        return { examples: [...disk.examples, example] };
    });
    const opened = made === '' ? null : resourceOf(itemResource, exampleKey(made));

    if (code !== null || parts === null || opened === null) {
        return code;
    }

    collectionStore.getState().openExamples(parts.workspaceId, parts.path, true);
    openExample(opened, KEPT);

    return null;
}
