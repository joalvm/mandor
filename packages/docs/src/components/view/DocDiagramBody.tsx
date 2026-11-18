import { useMessages } from '@mandor/i18n';

import type { DrawnDiagram } from '../../hooks/useDiagram.js';

type DocDiagramBodyProps = {
    drawn: DrawnDiagram | null;
    failed: boolean;
    showingCode: boolean;
    source: string;
};

/**
 * What the box of a diagram holds: the source when it was asked for, the drawing once there is
 * one, and a word while the first is on its way. A source that never came out holds nothing, and
 * the caption under it says why.
 */
export function DocDiagramBody({ drawn, failed, showingCode, source }: DocDiagramBodyProps) {
    const messages = useMessages('docs');

    if (showingCode) {
        return (
            <pre data-part="doc-diagram-source">
                <code>{source}</code>
            </pre>
        );
    }

    if (drawn !== null) {
        return (
            <div className="overflow-auto" data-part="doc-diagram-canvas">
                <img
                    alt={messages('diagramAlt')}
                    height={drawn.height}
                    src={drawn.src}
                    width={drawn.width}
                />
            </div>
        );
    }

    if (failed) {
        return null;
    }

    return (
        <p className="text-sm text-text-secondary" data-part="doc-diagram-loading">
            {messages('diagramDrawing')}
        </p>
    );
}
