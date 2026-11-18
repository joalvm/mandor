import { useMessages } from '@mandor/i18n';
import type { ComponentType } from 'react';

import { JsonPreview } from './JsonPreview.js';
import type { BodyContent } from './lib/body-content.js';
import type { BodyKind } from './lib/body-views.js';

type BodyPreviewProps = {
    content: BodyContent;
};

/** How a browser would draw a body: as an image, as a page, or, for JSON, as a table to walk. */
type PreviewShape = 'image' | 'page' | 'table';

/** Only images, pages and JSON offer a preview; the rest would show as a page shows plain text. */
const SHAPE_OF_KIND: Readonly<Record<BodyKind, PreviewShape>> = {
    binary: 'page',
    html: 'page',
    image: 'image',
    javascript: 'page',
    json: 'table',
    markdown: 'page',
    text: 'page',
    xml: 'page',
};

function BodyImage({ content }: BodyPreviewProps) {
    return (
        <div className="size-full overflow-auto p-pad-panel" data-part="response-image">
            <ImageOrWait dataUrl={content.dataUrl} />
        </div>
    );
}

/** What a preview shows until every byte of its body is in. */
function BodyWaiting() {
    const labels = useMessages('requests');

    return <span className="text-xs text-text-secondary">{labels('bodyLoading')}</span>;
}

function ImageOrWait({ dataUrl }: { dataUrl: BodyContent['dataUrl'] }) {
    const labels = useMessages('requests');

    if (dataUrl === null) {
        return <BodyWaiting />;
    }

    return <img alt={labels('previewImage')} className="max-w-full" src={dataUrl} />;
}

/** The text of a preview is empty until every byte is in: an empty body is never drawn. */
function TextWaiting() {
    return (
        <div className="size-full overflow-auto p-pad-panel" data-part="response-waiting">
            <BodyWaiting />
        </div>
    );
}

function BodyPage({ content }: BodyPreviewProps) {
    const labels = useMessages('requests');

    if (content.text === '') {
        return <TextWaiting />;
    }

    return (
        <iframe
            className="size-full border-0 bg-surface-panel"
            data-part="response-page"
            sandbox=""
            srcDoc={content.text}
            title={labels('previewPage')}
        />
    );
}

function BodyTable({ content }: BodyPreviewProps) {
    if (content.text === '') {
        return <TextWaiting />;
    }

    return <JsonPreview text={content.text} />;
}

const SHAPES: Readonly<Record<PreviewShape, ComponentType<BodyPreviewProps>>> = {
    image: BodyImage,
    page: BodyPage,
    table: BodyTable,
};

/**
 * A body drawn the way a browser would: an image as an image, a page in a frame with no
 * permissions, a JSON document as a table to walk.
 */
export function BodyPreview({ content }: BodyPreviewProps) {
    const Shape = SHAPES[SHAPE_OF_KIND[content.kind]];

    return <Shape content={content} />;
}
