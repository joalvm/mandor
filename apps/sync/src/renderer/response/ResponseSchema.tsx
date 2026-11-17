import { useMessages, useSchemaWords } from '@mandor/i18n';
import type { SchemaIssue } from '@mandor/validate';
import { SchemaPane, Select, type EditorOptions } from '@mandor/ui';

/**
 * The schema an answer answers to: the one of the example it stands for, among those of the
 * status that came, and the ways to change it in place.
 */
export type AnswerSchema = {
    /** The key of the example the schema is read from and written to. */
    chosen: string;
    /** The examples of the status that came, best fit first: any of them can be chosen instead. */
    examples: readonly { key: string; name: string }[];
    /** The rules of the schema the answer broke. */
    issues: readonly SchemaIssue[];
    /** The body of the answer, read for what came where a rule broke. */
    judged: string;
    /** Who owns the text: the schema of the example is one document in every view of it. */
    modelKey: string;
    onChange: (text: string) => void;
    onChoose: (key: string) => void;
    /** Writes the schema from the body of the answer. */
    onGenerate: () => void;
    /** The schema as text; empty while the example has none. */
    text: string;
};

type ResponseSchemaProps = AnswerSchema & {
    /** The status that came, which chose the examples. */
    status: number;
};

const OPTIONS: EditorOptions = { lineNumbers: 'on', wordWrap: 'on' };

/**
 * The schema an answer answers to, edited where it is read: the text is the schema of the
 * example the answer stands for, and what is typed is that example's draft. The strip names the
 * example and offers the others of the status; under the editor, the rules the answer broke, each
 * a click from where it is written.
 */
export function ResponseSchema({
    chosen,
    examples,
    issues,
    judged,
    modelKey,
    onChange,
    onChoose,
    onGenerate,
    status,
    text,
}: ResponseSchemaProps) {
    const labels = useMessages('requests');
    const schemaWords = useSchemaWords();

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-col" data-part="response-schema">
            <SchemaPane
                editor={{ key: modelKey, language: 'json', onValueChange: onChange, value: text }}
                issues={schemaWords.issues(
                    labels('exampleSchemaReceived', { status: String(status) }),
                    issues,
                )}
                judged={judged}
                labels={{
                    ...schemaWords.pane,
                    editor: labels('exampleSchemaEditor'),
                    generate: labels('generateFromResponse'),
                }}
                onGenerate={onGenerate}
                options={OPTIONS}
            >
                <Select
                    fitChosen
                    label={labels('responseSchemaExample')}
                    onValueChange={onChoose}
                    options={examples.map(({ key, name }) => ({ label: name, value: key }))}
                    value={chosen}
                />
            </SchemaPane>
        </div>
    );
}
