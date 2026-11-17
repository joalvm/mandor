import { useMessages, useSchemaWords } from '@mandor/i18n';
import type { RequestBody } from '@mandor/schema';
import { SchemaPane, type EditorOptions } from '@mandor/ui';
import type { TemplateIssue } from '@mandor/validate';

type RequestBodySchemaProps = {
    body: RequestBody;
    /** The rules of the schema the body breaks. */
    broken: readonly TemplateIssue[];
    /** The schema the body tells, or nothing while the body has no shape to tell. */
    onGenerate: (() => void) | undefined;
    onSchemaChange: (schema: string) => void;
    resource: string;
    schema: string;
};

const OPTIONS: EditorOptions = { wordWrap: 'on' };

/**
 * The JSON Schema the body of a request promises, in a tab of its own: the same pane the
 * messages of Realtime carry. The body it judges is the one on the Body tab, and under it, the
 * rules that body breaks; its options write into its text.
 */
export function RequestBodySchema({
    body,
    broken,
    onGenerate,
    onSchemaChange,
    resource,
    schema,
}: RequestBodySchemaProps) {
    const labels = useMessages('requests');
    const schemaWords = useSchemaWords();

    return (
        <SchemaPane
            editor={{
                key: `request-body-schema-${resource}`,
                language: 'json',
                onValueChange: onSchemaChange,
                value: schema,
            }}
            issues={schemaWords.issues(labels('body'), broken)}
            // The judged text is read only where a rule broke, and only a json body breaks any.
            judged={'content' in body ? body.content : undefined}
            labels={{
                ...schemaWords.pane,
                editor: labels('bodySchemaEditor'),
                generate: labels('generateFromBody'),
            }}
            onGenerate={onGenerate}
            options={OPTIONS}
        />
    );
}
