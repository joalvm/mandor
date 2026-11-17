import type { RequestExample } from '@mandor/schema';

/** An example as typed in the window, the schema of its answer included, and not yet on the file. */
export type ExampleDraft = {
    example: RequestExample;
};

export type ExamplesSlice = {
    /**
     * Filed under the resource of the example, never under the one of its request: the draft of
     * the request and the draft of one of its examples are written apart and never overwrite each
     * other.
     */
    exampleDrafts: Record<string, ExampleDraft | undefined>;
};

export function initialExamplesSlice(): ExamplesSlice {
    return { exampleDrafts: {} };
}
