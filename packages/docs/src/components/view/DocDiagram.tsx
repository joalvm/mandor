import { useMessages } from '@mandor/i18n';
import { useState } from 'react';

import { useDiagram } from '../../hooks/useDiagram.js';
import { DIAGRAM_FIT, diagramZoom } from '../../lib/diagram-zoom.js';
import { DocDiagramActions } from './DocDiagramActions.js';
import { DocDiagramBody } from './DocDiagramBody.js';

type DocDiagramProps = { line: number | undefined; source: string };

/**
 * A `mermaid` block, drawn. While it is being written a diagram half done does not wipe out the
 * last one that came out: that one stays, with the error under it, and the rest of the doc still
 * reads. Only the first line of the error is shown; the rest is the parser talking to itself.
 */
export function DocDiagram({ line, source }: DocDiagramProps) {
    const { drawn, failure, stage } = useDiagram(source);
    const [step, setStep] = useState(DIAGRAM_FIT);
    const [showingCode, setShowingCode] = useState(false);

    return (
        <figure
            className="group relative"
            data-line={line}
            data-part="doc-diagram"
            data-zoom={diagramZoom(step)}
        >
            <DocDiagramActions
                onCode={setShowingCode}
                onStep={setStep}
                showingCode={showingCode}
                source={source}
                step={step}
            />
            <DocDiagramBody
                drawn={drawn}
                failed={failure !== null}
                showingCode={showingCode}
                source={source}
            />
            <DocDiagramError drawn={drawn} failure={failure} />
            <div aria-hidden data-part="doc-diagram-stage" ref={stage} />
        </figure>
    );
}

function DocDiagramError({
    drawn,
    failure,
}: {
    drawn: ReturnType<typeof useDiagram>['drawn'];
    failure: ReturnType<typeof useDiagram>['failure'];
}) {
    const messages = useMessages('docs');

    if (failure === null) {
        return null;
    }

    return (
        <figcaption className="text-sm text-text-error" data-part="doc-diagram-error">
            {messages(drawn === null ? 'diagramFailed' : 'diagramStale')} {failure.split('\n')[0]}
        </figcaption>
    );
}
