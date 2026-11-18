import { fireAndForget } from '@mandor/shell';
import { useWindowTheme } from '@mandor/ui';
import { useEffect, useRef, useState, type RefObject } from 'react';

import { drawDiagram, type DiagramDrawing } from '../lib/draw-diagram.js';

export type DrawnDiagram = Extract<DiagramDrawing, { kind: 'drawn' }>;

type Diagram = {
    /** The last drawing that came out. A diagram half written does not take it away. */
    drawn: DrawnDiagram | null;
    /** Why the source as it is now did not come out, or `null` when it did. */
    failure: string | null;
    /** The box out of sight the drawing is measured in. It has to be in the page to measure. */
    stage: RefObject<HTMLDivElement | null>;
};

/** How long the source has to stay still before it is drawn: typing does not draw each letter. */
const PAUSE_MS = 250;

/**
 * A diagram of a doc, drawn from its source and drawn again when the source settles or the window
 * changes theme, since the colours of the picture are the page's. A drawing that is no longer
 * wanted when it comes back is dropped.
 */
export function useDiagram(source: string): Diagram {
    const theme = useWindowTheme();
    const stage = useRef<HTMLDivElement>(null);
    const [drawn, setDrawn] = useState<DrawnDiagram | null>(null);
    const [failure, setFailure] = useState<string | null>(null);

    useEffect(() => {
        let wanted = true;
        const timer = setTimeout(() => {
            if (stage.current === null) {
                return;
            }

            fireAndForget(
                drawDiagram(source, stage.current).then((drawing) => {
                    if (!wanted) {
                        return;
                    }

                    if (drawing.kind === 'failed') {
                        setFailure(drawing.message);

                        return;
                    }

                    setDrawn(drawing);
                    setFailure(null);
                }),
            );
        }, PAUSE_MS);

        return () => {
            wanted = false;
            clearTimeout(timer);
        };
    }, [source, theme]);

    return { drawn, failure, stage };
}
