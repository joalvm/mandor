import { useMessages } from '@mandor/i18n';
import { useKeepTab } from '@mandor/shell';
import { useSchemaChecker, useToast } from '@mandor/ui';
import { keepingStrictness } from '@mandor/validate';

import { editExampleSchema } from '../lib/example-draft-write.js';
import { generatedSchema, schemaErrorOf } from '../lib/example-schema.js';
import type { ExampleSchemaTab } from '../components/examples/ExampleSchema.js';
import type { ExampleView } from './useExample.js';

/**
 * What the Schema tab of an example needs: the text of the schema of its answer, and the two
 * ways to change it — typing, and writing it from the expected body. A body that is not JSON has
 * no schema to write, and the tab says so without blocking. Writing it again keeps the options
 * the schema had: they were chosen, not inferred.
 */
export function useExampleSchema(
    resource: string,
    view: ExampleView | undefined,
): ExampleSchemaTab {
    const labels = useMessages('requests');
    const { notify } = useToast();
    const keep = useKeepTab();
    const checked = useSchemaChecker();

    function change(text: string): void {
        // An edited schema is no longer a look the next click replaces.
        keep();
        editExampleSchema(resource, text);
    }

    return {
        error: checked ? schemaErrorOf(view?.example.schema) : undefined,
        onChange: change,
        onGenerate: () => {
            const text = generatedSchema(view?.example.body ?? '');

            if (text === null) {
                notify({ title: labels('exampleSchemaNotJson'), tone: 'warning' });

                return;
            }

            change(keepingStrictness(view?.example.schema ?? '', text));
        },
        text: view?.example.schema,
    };
}
