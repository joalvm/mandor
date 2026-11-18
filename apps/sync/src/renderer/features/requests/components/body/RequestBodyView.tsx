import { useMessages } from '@mandor/i18n';
import {
    bodyFilePathSchema,
    type Environment,
    type RequestBody,
    type RequestBodyOf,
    type RequestBodyType,
    type Variable,
} from '@mandor/schema';
import {
    CodeEditor,
    Input,
    type CodeEditorHandle,
    type EditorOptions,
    type EditorVariables,
} from '@mandor/ui';
import { lazy, Suspense, type ComponentType, type ReactNode, type RefObject } from 'react';

import type { GraphqlSchemaAsk } from '../../hooks/useGraphqlSchema.js';
import { RequestPairs } from '../pairs/RequestPairs.js';
import { LANGUAGE_OF_BODY } from './body-kinds.js';
import { RequestFormFields } from './RequestFormFields.js';

/** What the view of each kind of body is handed: its body, and what the editor holds for it. */
export type BodyViewProps<T extends RequestBodyType> = {
    body: RequestBodyOf<T>;
    editor: RefObject<CodeEditorHandle | null>;
    environment: Environment | undefined;
    /** The path being typed, which reaches the body only once the workspace keeps it. */
    file: string;
    modelKey: string;
    onChange: (body: RequestBody) => void;
    onFileChange: (next: string) => void;
    onVariablesChange: (variables: readonly Variable[]) => void;
    options: EditorOptions;
    schema: GraphqlSchemaAsk;
    variables: EditorVariables;
};

/**
 * The one line of a binary body: a path inside the workspace, said in place when what was
 * typed would leave it.
 */
function BinaryBody({
    file,
    onFileChange,
}: {
    file: string;
    onFileChange: (next: string) => void;
}): ReactNode {
    const labels = useMessages('requests');
    const refused = file !== '' && !bodyFilePathSchema.safeParse(file).success;

    return (
        <div className="flex flex-col gap-gap-tight" data-part="request-body-file">
            <Input
                className="font-mono"
                invalid={refused}
                label={labels('binaryFile')}
                onValueChange={onFileChange}
                value={file}
            />
            <span className="text-xs text-text-secondary">
                {refused ? labels('binaryFileRefused') : labels('binaryFileHelp')}
            </span>
        </div>
    );
}

/** A body written as text, in the editor of the language it speaks. */
function TextBody({
    body,
    editor,
    modelKey,
    onChange,
    options,
}: BodyViewProps<'json' | 'text' | 'xml'>) {
    const labels = useMessages('requests');

    return (
        <div className="min-h-0 flex-1" data-part="request-body-content">
            <CodeEditor
                labels={{
                    editor: labels('bodyEditor'),
                }}
                language={LANGUAGE_OF_BODY[body.type]}
                modelKey={`${modelKey}-body`}
                onValueChange={(content) => {
                    onChange({ ...body, content });
                }}
                options={options}
                ref={editor}
                value={body.content}
            />
        </div>
    );
}

/** The pairs of a url-encoded body, written as the lines of a table. */
function UrlencodedBody({
    body,
    environment,
    onChange,
    onVariablesChange,
}: BodyViewProps<'urlencoded'>) {
    const labels = useMessages('requests');

    return (
        <RequestPairs
            environment={environment}
            lines={body.fields}
            onChange={(fields) => {
                onChange({ fields, type: 'urlencoded' });
            }}
            onVariablesChange={onVariablesChange}
            title={labels('bodyUrlencoded')}
        />
    );
}

/** The fields of a multipart form, text and files alike. */
function FormBody({ body, environment, onChange, onVariablesChange }: BodyViewProps<'form'>) {
    return (
        <RequestFormFields
            environment={environment}
            fields={body.fields}
            onChange={(fields) => {
                onChange({ fields, type: 'form' });
            }}
            onVariablesChange={onVariablesChange}
        />
    );
}

/**
 * The GraphQL library and its language service weigh as much as the rest of a request together,
 * and most requests never speak GraphQL: the editor of a graphql body loads the first time one
 * is drawn, not with the window.
 */
const GraphqlBodyLoaded = lazy(async () => ({
    default: (await import('./GraphqlBody.js')).GraphqlBody,
}));

/** A graphql body, drawn once its editor has loaded; until then, nothing. */
function GraphqlBody(props: BodyViewProps<'graphql'>) {
    return (
        <Suspense fallback={null}>
            <GraphqlBodyLoaded {...props} />
        </Suspense>
    );
}

/** A request without a body has nothing to write. */
function NoBody(): null {
    return null;
}

const BODY_VIEWS: { readonly [T in RequestBodyType]: ComponentType<BodyViewProps<T>> } = {
    binary: BinaryBody,
    form: FormBody,
    graphql: GraphqlBody,
    json: TextBody,
    none: NoBody,
    text: TextBody,
    urlencoded: UrlencodedBody,
    xml: TextBody,
};

/** The view of the kind the body is, handed the body of that kind. */
export function RequestBodyView<T extends RequestBodyType>(props: BodyViewProps<T> & { type: T }) {
    const View: ComponentType<BodyViewProps<T>> = BODY_VIEWS[props.type];

    return <View {...props} />;
}
