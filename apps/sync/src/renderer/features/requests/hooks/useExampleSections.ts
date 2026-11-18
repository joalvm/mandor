import { useResourceSection } from '@mandor/shell';

import type { SendEntry } from '../responses.slice.js';
import type { ExampleView } from './useExample.js';
import { useExampleReview, type ExampleReview } from './useExampleReview.js';
import { useExampleSchema } from './useExampleSchema.js';
import type { ExampleSchemaTab } from '../components/examples/ExampleSchema.js';

type ExampleSections = {
    review: ExampleReview;
    schema: ExampleSchemaTab;
    /** The tab of the strip that is open, kept with the resource like the sections of the request. */
    section: string;
    setSection: (section: string) => void;
};

/**
 * What the sections under the response of an example hang on: which one is open, what a person
 * does with the differences, and the schema. Taking an answer the schema still refuses opens
 * the schema, where the person can see why.
 */
export function useExampleSections(
    resource: string,
    view: ExampleView | undefined,
    entry: SendEntry,
): ExampleSections {
    const [section, setSection] = useResourceSection(resource, 'body', 'example');
    const review = useExampleReview(resource, view?.example, entry, {
        onSchemaLeft: () => {
            setSection('schema');
        },
        schema: view?.example.schema,
    });
    const schema = useExampleSchema(resource, view);

    return { review, schema, section, setSection };
}
