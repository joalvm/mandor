import { useMessages } from '@mandor/i18n';
import { RowLabel, Tree, TreeRow } from '@mandor/ui';
import { useMemo, useState } from 'react';

import {
    containerMark,
    isContainer,
    jsonLines,
    openAfter,
    parsedJson,
    type JsonLine,
} from './lib/json-tree.js';
import { JsonValue } from './JsonValue.js';

type JsonPreviewProps = {
    text: string;
};

const CLOSED: ReadonlySet<string> = new Set();

/**
 * A JSON document as a tree to walk: its first level open, each value that holds others a line
 * that opens. A document that is a single value is that value; a text that is not JSON says so,
 * and the formats of the band still read it as it came.
 */
export function JsonPreview({ text }: JsonPreviewProps) {
    const document = useMemo(() => parsedJson(text), [text]);

    return (
        <div className="flex size-full min-h-0 flex-col text-xs" data-part="response-json">
            <JsonContent document={document} />
        </div>
    );
}

function JsonContent({ document }: { document: ReturnType<typeof parsedJson> }) {
    const labels = useMessages('requests');

    if (document === undefined) {
        return (
            <span className="block p-pad-panel text-text-secondary">
                {labels('previewNotJson')}
            </span>
        );
    }

    if (!isContainer(document.value)) {
        return (
            <span className="block overflow-auto p-pad-panel">
                <JsonValue value={document.value} />
            </span>
        );
    }

    return <JsonDocument value={document.value} />;
}

/**
 * The lines of a document that holds others, as every tree of the window: what is closed is
 * never walked, and only the lines on screen enter the DOM, so a level of a hundred thousand
 * scrolls as one of ten does.
 */
function JsonDocument({ value }: { value: Record<string, unknown> | unknown[] }) {
    const labels = useMessages('requests');
    const [open, setOpen] = useState(CLOSED);
    const lines = useMemo(() => jsonLines(value, open), [value, open]);

    const fold = (id: string, expanded: boolean): void => {
        setOpen(openAfter(open, id, expanded));
    };

    return (
        <Tree
            chevrons
            label={labels('previewJsonLabel')}
            lines={lines}
            onActivate={(id) => {
                const line = lines.find((one) => one.id === id);

                if (line?.expanded !== undefined) {
                    fold(id, !line.expanded);
                }
            }}
            onExpandedChange={fold}
        >
            {lines.map((line) => (
                <JsonLineRow key={line.id} line={line} />
            ))}
        </Tree>
    );
}

/** One line: the name to the left, what it holds to the right, cut to the line it has. */
function JsonLineRow({ line }: { line: JsonLine }) {
    return (
        <TreeRow>
            <RowLabel className="w-40 flex-none font-semibold">{line.key}</RowLabel>
            <span className="min-w-0 flex-1 truncate" data-part="json-held">
                <JsonHeld value={line.value} />
            </span>
        </TreeRow>
    );
}

function JsonHeld({ value }: { value: unknown }) {
    if (isContainer(value)) {
        return <span className="text-text-secondary">{containerMark(value)}</span>;
    }

    return <JsonValue value={value} />;
}
