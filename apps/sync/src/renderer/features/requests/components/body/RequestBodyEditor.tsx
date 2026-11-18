import { useEditorVariables } from '@mandor/env';
import { useEditorIssueMessage } from '@mandor/i18n';
import {
    bodyFilePathSchema,
    type Environment,
    type RequestBody,
    type Variable,
} from '@mandor/schema';
import { schemaLintOf, type CodeEditorHandle } from '@mandor/ui';
import { useMemo, useRef, useState } from 'react';

import type { GraphqlSchemaAsk } from '../../hooks/useGraphqlSchema.js';
import { bodyFileOf } from '../../lib/body-file.js';
import { bodyAfterKindChange } from './body-kinds.js';
import { RequestBodyBand } from './RequestBodyBand.js';
import { RequestBodyView } from './RequestBodyView.js';

type RequestBodyEditorProps = {
    body: RequestBody;
    /** The environment in force: the `{{var}}` of the body read their tone from it. */
    environment: Environment | undefined;
    /** The JSON Schema the body promises, as text; the margin checks the content against it. */
    bodySchema?: string | undefined;
    /** Who owns the text: two views of one request share the document and its undo. */
    modelKey: string;
    onChange: (body: RequestBody) => void;
    /** The body the schema asks for, or nothing while there is no schema to generate from. */
    onGenerate?: (() => void) | undefined;
    /** The variables the body names and nobody declared, handed over to be declared. */
    onVariablesChange: (variables: readonly Variable[]) => void;
    /** What is known of the server a graphql body asks; the other kinds ignore it. */
    schema: GraphqlSchemaAsk;
};

/**
 * What gets sent, one editor per kind of body. The kind is a choice; the content keeps its
 * `{{var}}` as written, because resolving happens on the way out and never on disk.
 */
export function RequestBodyEditor({
    body,
    bodySchema,
    environment,
    modelKey,
    onChange,
    onGenerate,
    onVariablesChange,
    schema,
}: RequestBodyEditorProps) {
    // The schema is read on every check of the margin; one read per schema written keeps the identity.
    const schemaLint = useMemo(() => schemaLintOf(bodySchema), [bodySchema]);
    const variables = useEditorVariables({ environment, onVariablesChange });
    // Every mark of the margin is read by whoever writes the body, in their language.
    const issueMessage = useEditorIssueMessage();
    /** The editor compares these by identity: a new object each render would rebuild it. */
    const options = useMemo(
        () => ({
            schemaLint,
            translate: issueMessage,
            variables: variables.editor,
            wordWrap: 'on' as const,
        }),
        [issueMessage, schemaLint, variables.editor],
    );
    const editor = useRef<CodeEditorHandle>(null);
    const diskFile = bodyFileOf(body);
    /** The path as typed: it reaches the disk only once it is a path the disk takes. */
    const [file, setFile] = useState(diskFile);
    /** The path on disk the typed one was last set from. */
    const [seenFile, setSeenFile] = useState(diskFile);

    // The disk wins when another view changed the path behind this one's back. Set while
    // drawing, so no frame shows the stale path.
    if (seenFile !== diskFile) {
        setSeenFile(diskFile);
        setFile(diskFile);
    }

    function onFileChange(next: string): void {
        setFile(next);

        if (bodyFilePathSchema.safeParse(next).success) {
            onChange({ type: 'binary', file: next });
        }
    }

    return (
        <div
            className="flex h-full min-h-0 flex-col gap-gap-control"
            data-part="request-body-editor"
        >
            <RequestBodyBand
                editor={editor}
                onGenerate={onGenerate}
                onTypeChange={(type) => {
                    onChange(bodyAfterKindChange(body, type));
                }}
                type={body.type}
            />
            <RequestBodyView
                body={body}
                editor={editor}
                environment={environment}
                file={file}
                modelKey={modelKey}
                onChange={onChange}
                onFileChange={onFileChange}
                onVariablesChange={onVariablesChange}
                options={options}
                schema={schema}
                type={body.type}
                variables={variables.editor}
            />
            {variables.popover}
        </div>
    );
}
