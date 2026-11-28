import { useMessages } from '@mandor/i18n';
import type { RequestBodyType } from '@mandor/schema';
import { fireAndForget } from '@mandor/shell';
import { Button, IconButton, Select, type CodeEditorHandle } from '@mandor/ui';
import type { RefObject } from 'react';

import { BEAUTIFIES, BODY_TYPE_GROUPS, BODY_TYPE_KEYS } from './body-kinds.js';

type RequestBodyBandProps = {
    /** The editor of the text of the body, which lays it out when its kind has a layout. */
    editor: RefObject<CodeEditorHandle | null>;
    /** The body the schema asks for, or nothing while there is no schema to generate from. */
    onGenerate?: (() => void) | undefined;
    onTypeChange: (type: RequestBodyType) => void;
    type: RequestBodyType;
};

/**
 * The band over the body of a request: the kind it is, picked from one list grouped by family,
 * and at the far end what can be done to its text: lay it out, or write it anew from its schema.
 */
export function RequestBodyBand({ editor, onGenerate, onTypeChange, type }: RequestBodyBandProps) {
    const labels = useMessages('requests');

    return (
        // band-policy: section-inset — the section around it gives the inset, and the band
        // starts on the same edge as the editor under it.
        <div
            className="flex h-section shrink-0 items-center gap-gap-control"
            data-part="request-body-band"
        >
            <Select
                label={labels('bodyType')}
                onValueChange={onTypeChange}
                options={BODY_TYPE_GROUPS.map((group) => ({
                    label: labels(group.key),
                    options: group.types.map((each) => ({
                        label: labels(BODY_TYPE_KEYS[each]),
                        value: each,
                    })),
                }))}
                value={type}
            />
            <BeautifyButton editor={editor} type={type} />
            <GenerateButton onGenerate={onGenerate} />
        </div>
    );
}

function BeautifyButton({ editor, type }: Pick<RequestBodyBandProps, 'editor' | 'type'>) {
    const labels = useMessages('requests');

    if (!BEAUTIFIES[type]) {
        return null;
    }

    return (
        <Button
            className="ms-auto"
            data-part="request-body-beautify"
            onClick={() => {
                fireAndForget(editor.current?.run('format'));
            }}
            size="sm"
            underlined={false}
            variant="link"
        >
            {labels('beautify')}
        </Button>
    );
}

function GenerateButton({ onGenerate }: Pick<RequestBodyBandProps, 'onGenerate'>) {
    const labels = useMessages('requests');

    if (onGenerate === undefined) {
        return null;
    }

    return (
        <IconButton
            data-part="request-body-generate"
            icon="format"
            label={labels('generateFromSchema')}
            onClick={onGenerate}
        />
    );
}
