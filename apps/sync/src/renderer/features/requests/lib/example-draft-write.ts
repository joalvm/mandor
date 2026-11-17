import { examplePartsOf, exampleItemOf } from '@mandor/collections';
import type { ErrorCode } from '@mandor/ipc';
import { exampleKeys, type RequestExample, type RequestItem } from '@mandor/schema';

import { requestsStore } from '../requests-store.js';

import { withSchemaText } from './example-schema.js';
import { writeExampleParts } from './write-example-parts.js';

/** The example a key names in a request, or nothing for a request not read or a key it lost. */
export function exampleAt(
    request: RequestItem | undefined,
    key: string,
): RequestExample | undefined {
    if (request === undefined) {
        return undefined;
    }

    const index = exampleKeys(request.examples).indexOf(key);

    return index === -1 ? undefined : request.examples[index];
}

function replaced(
    examples: RequestExample[],
    key: string,
    example: RequestExample,
): RequestExample[] {
    const index = exampleKeys(examples).indexOf(key);

    return examples.map((each, at) => (at === index ? example : each));
}

/**
 * Keeps what was typed into an example, the schema of its answer included, as its draft. What
 * lands back on what the file holds is no edit at all, and the draft lets go of it: volver no es
 * cambiar.
 */
export function editExample(resource: string, example: RequestExample): void {
    const parts = examplePartsOf(resource);
    const item = exampleItemOf(resource);

    if (parts === null || item === null) {
        return;
    }

    const state = requestsStore.getState();
    const saved = exampleAt(state.requests[item], parts.key);

    if (JSON.stringify(example) === JSON.stringify(saved)) {
        state.clearExampleDraft(resource);

        return;
    }

    state.setExampleDraft(resource, { example });
}

/** The example as the window has it: its draft, else what its request was read with. */
function exampleShown(resource: string): RequestExample | undefined {
    const state = requestsStore.getState();
    const item = exampleItemOf(resource);
    const parts = examplePartsOf(resource);

    return (
        state.exampleDrafts[resource]?.example ??
        (item === null || parts === null ? undefined : exampleAt(state.requests[item], parts.key))
    );
}

/**
 * Keeps the text of the schema of the answer of an example, with the example as it stands. An
 * empty text is no schema, and saving it takes the key from the file.
 */
export function editExampleSchema(resource: string, text: string): void {
    const example = exampleShown(resource);

    if (example !== undefined) {
        editExample(resource, withSchemaText(example, text));
    }
}

/**
 * Puts the draft of the example on its request's file, and only the example: the request's own
 * draft is not carried along. A refusal keeps the draft and answers its code, for whoever saved
 * to tell it as a toast. An example with no draft has nothing to save.
 */
export async function saveExample(resource: string): Promise<ErrorCode | null> {
    const draft = requestsStore.getState().exampleDrafts[resource];
    const parts = examplePartsOf(resource);
    const item = exampleItemOf(resource);

    if (draft === undefined || parts === null || item === null) {
        return null;
    }

    requestsStore.getState().clearExampleDraft(resource);

    const code = await writeExampleParts(item, (disk) => ({
        examples: replaced(disk.examples, parts.key, draft.example),
    }));

    if (code !== null) {
        requestsStore.getState().setExampleDraft(resource, draft);
    }

    return code;
}
