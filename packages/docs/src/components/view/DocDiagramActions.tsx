import { useMessages } from '@mandor/i18n';
import { IconButton } from '@mandor/ui';

import { DIAGRAM_FIT, DIAGRAM_ZOOM } from '../../lib/diagram-zoom.js';
import { DocCopy } from './DocCopy.js';

type DocDiagramActionsProps = {
    showingCode: boolean;
    source: string;
    step: number;
    onCode: (showing: boolean) => void;
    onStep: (step: number) => void;
};

/** In the corner of the diagram, over it: hidden at rest, there under the pointer or the focus. */
const ACTIONS = [
    'absolute top-pad-control end-pad-control flex items-center gap-gap-tight',
    'rounded-md',
    'opacity-0 transition-opacity duration-fast',
    'group-focus-within:opacity-100 group-hover:opacity-100',
].join(' ');

/**
 * What a diagram offers in its corner: a size in steps, back to the width of the page in one
 * press, the source it was drawn from instead of the drawing, and a copy of that source.
 */
export function DocDiagramActions({
    showingCode,
    source,
    step,
    onCode,
    onStep,
}: DocDiagramActionsProps) {
    const messages = useMessages('docs');

    return (
        <div className={ACTIONS} data-part="doc-block-actions">
            <IconButton
                disabled={step === 0}
                disabledReason={messages('diagramSmallest')}
                icon="zoom-out"
                label={messages('diagramZoomOut')}
                onClick={() => {
                    onStep(step - 1);
                }}
                size="xs"
            />
            <IconButton
                active={step === DIAGRAM_FIT}
                icon="fold"
                label={messages('diagramFit')}
                onClick={() => {
                    onStep(DIAGRAM_FIT);
                }}
                size="xs"
            />
            <IconButton
                disabled={step === DIAGRAM_ZOOM.length - 1}
                disabledReason={messages('diagramLargest')}
                icon="zoom-in"
                label={messages('diagramZoomIn')}
                onClick={() => {
                    onStep(step + 1);
                }}
                size="xs"
            />
            <IconButton
                active={showingCode}
                icon="code"
                label={messages(showingCode ? 'diagramShowDrawing' : 'diagramShowCode')}
                onClick={() => {
                    onCode(!showingCode);
                }}
                size="xs"
            />
            <DocCopy label={messages('copyDiagram')} text={source} />
        </div>
    );
}
